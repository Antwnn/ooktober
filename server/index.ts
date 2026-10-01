import { bundle } from "@remotion/bundler";
import {
  makeCancelSignal,
  openBrowser,
  renderMedia,
  renderStill,
  selectComposition,
  type HeadlessBrowser,
} from "@remotion/renderer";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { ooktoberSchema, posterSchema } from "../src/ooktober/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const COMPOSITION_ID = "OoktoberWord";
const PORT = Number(process.env.PORT) || 3001;
const RENDER_THREADS = Number(process.env.RENDER_THREADS) || 2;
const MAX_PARALLEL_RENDERS = Number(process.env.MAX_PARALLEL_RENDERS) || 1;
const MAX_QUEUED_RENDERS = Number(process.env.MAX_QUEUED_RENDERS) || 10;
const BROWSER_RECYCLE_AFTER = 50;

// sharp keeps decoded images in an in-process cache and uses one thread per
// core by default; a poster is converted once, so neither helps here.
sharp.cache(false);
sharp.concurrency(1);

// Rendered files are transient: they live in a private folder under the OS
// temp dir, are deleted as soon as they've been sent once, and anything never
// fetched is swept after FILE_TTL_MS. The folder itself is removed on exit.
const OUT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ooktober-"));
const FILE_TTL_MS = 2 * 60 * 1000;

const removeFile = (filePath: string) =>
  fs.rm(filePath, { force: true }, () => {});

// Safety net for renders whose download never arrives (tab closed, network
// error…). Each file gets its own timer, cleared if it's downloaded first.
const expiryTimers = new Map<string, NodeJS.Timeout>();
const scheduleExpiry = (fileName: string) => {
  const timer = setTimeout(() => {
    expiryTimers.delete(fileName);
    removeFile(path.join(OUT_DIR, fileName));
  }, FILE_TTL_MS);
  timer.unref();
  expiryTimers.set(fileName, timer);
};

const cleanupOutDir = () =>
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
process.on("exit", cleanupOutDir);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    closeBrowser().finally(() => process.exit(0));
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// The Remotion bundle only needs to be built once; every render reuses it.
// In production the Docker image prebuilds it (npm run build → build/), so
// the server never runs webpack at runtime, which is too memory-hungry to
// share a small container with Chrome.
const PREBUILT_BUNDLE = path.join(PROJECT_ROOT, "build");
let bundleLocationPromise: Promise<string> | null = fs.existsSync(
  path.join(PREBUILT_BUNDLE, "index.html"),
)
  ? Promise.resolve(PREBUILT_BUNDLE)
  : null;
const getBundleLocation = () => {
  if (!bundleLocationPromise) {
    bundleLocationPromise = bundle({
      entryPoint: path.join(PROJECT_ROOT, "src/index.ts"),
      onProgress: () => {},
    });
  }
  return bundleLocationPromise;
};

// --- Render resources -------------------------------------------------------
//
// Chrome is the expensive part of a render (hundreds of MB and dozens of
// threads per instance). Launching one per request — twice, since
// selectComposition and renderMedia each opened their own — is what made
// memory and threads grow with traffic. Instead the server keeps a single
// Chrome alive and every render opens tabs in it.
let browserPromise: Promise<HeadlessBrowser> | null = null;
let rendersOnBrowser = 0;

const getBrowser = () => {
  if (!browserPromise) {
    const promise = openBrowser("chrome");
    browserPromise = promise;
    rendersOnBrowser = 0;
    const forget = () => {
      if (browserPromise === promise) browserPromise = null;
    };
    promise.then((browser) => browser.once("closed", forget), forget);
  }
  return browserPromise;
};

const closeBrowser = async () => {
  const promise = browserPromise;
  browserPromise = null;
  if (!promise) return;
  await promise.then((browser) => browser.close({ silent: true })).catch(() => {});
};

// Renders run one at a time (MAX_PARALLEL_RENDERS) in a FIFO queue, and the
// queue itself is bounded: past MAX_QUEUED_RENDERS waiting requests the
// server answers 503 straight away instead of piling up work it can't serve.
class ServerBusyError extends Error {}
class ClientGoneError extends Error {}

let activeRenders = 0;
const renderQueue: Array<() => void> = [];

const runRender = async <T>(
  isClientGone: () => boolean,
  task: (browser: HeadlessBrowser) => Promise<T>,
): Promise<T> => {
  if (activeRenders >= MAX_PARALLEL_RENDERS) {
    if (renderQueue.length >= MAX_QUEUED_RENDERS) throw new ServerBusyError();
    await new Promise<void>((resolve) => renderQueue.push(resolve));
  } else {
    activeRenders++;
  }
  try {
    // The visitor may have closed the tab while waiting in the queue.
    if (isClientGone()) throw new ClientGoneError();
    // Chrome slowly accumulates memory over many renders: restart it every
    // BROWSER_RECYCLE_AFTER renders, when no other render is using it.
    if (rendersOnBrowser >= BROWSER_RECYCLE_AFTER && activeRenders === 1) {
      await closeBrowser();
    }
    const browser = await getBrowser();
    rendersOnBrowser++;
    try {
      return await task(browser);
    } catch (err) {
      // A failed render can leave Chrome in a bad state: start fresh next
      // time (only if no other render is using it).
      if (!isClientGone() && activeRenders === 1) await closeBrowser();
      throw err;
    }
  } finally {
    const next = renderQueue.shift();
    if (next) {
      next();
    } else {
      activeRenders--;
    }
  }
};

// Stops the render as soon as the visitor disconnects (tab closed, page
// reloaded, new attempt), so abandoned requests don't keep Chrome and
// ffmpeg busy for nothing.
const watchClient = (res: express.Response) => {
  const { cancelSignal, cancel } = makeCancelSignal();
  let gone = false;
  res.on("close", () => {
    if (!res.writableFinished) {
      gone = true;
      cancel();
    }
  });
  return { cancelSignal, isClientGone: () => gone };
};

const sendRenderError = (
  res: express.Response,
  err: unknown,
  isClientGone: () => boolean,
  fallback: string,
) => {
  if (isClientGone() || err instanceof ClientGoneError) return;
  if (err instanceof ServerBusyError) {
    res.status(503).json({ error: "The server is busy, please try again in a minute." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : fallback });
};

app.post("/api/render", async (req, res) => {
  const parsed = ooktoberSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.text.trim().length === 0) {
    res.status(400).json({ error: "A non-empty 'text' field is required." });
    return;
  }

  const fileName = `ooktober-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
  const outputLocation = path.join(OUT_DIR, fileName);
  const { cancelSignal, isClientGone } = watchClient(res);

  try {
    const serveUrl = await getBundleLocation();
    const inputProps = parsed.data;

    await runRender(isClientGone, async (browser) => {
      const composition = await selectComposition({
        serveUrl,
        id: COMPOSITION_ID,
        inputProps,
        puppeteerInstance: browser,
      });

      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation,
        inputProps,
        puppeteerInstance: browser,
        cancelSignal,
        // Hosted containers report the host's CPU count (60+ on Railway), so
        // Remotion and x264 would spawn that many workers and blow the memory
        // limit. Cap both; RENDER_THREADS can raise it on a bigger machine.
        concurrency: RENDER_THREADS,
        ffmpegOverride: ({ args }) => [
          ...args.slice(0, -1),
          "-threads",
          String(RENDER_THREADS),
          args[args.length - 1],
        ],
      });
    });

    if (isClientGone()) {
      removeFile(outputLocation);
      return;
    }
    scheduleExpiry(fileName);
    res.json({ downloadUrl: `/api/download/${fileName}` });
  } catch (err) {
    removeFile(outputLocation);
    sendRenderError(res, err, isClientGone, "Render failed.");
  }
});

app.post("/api/poster-render", async (req, res) => {
  const parsed = posterSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.text.trim().length === 0) {
    res.status(400).json({ error: "A non-empty 'text' field is required." });
    return;
  }

  const id = `ooktober-poster-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const pngPath = path.join(OUT_DIR, `${id}.png`);
  const cmykJpegPath = path.join(OUT_DIR, `${id}-cmyk.jpg`);
  const pdfFileName = `${id}.pdf`;
  const pdfPath = path.join(OUT_DIR, pdfFileName);
  const { cancelSignal, isClientGone } = watchClient(res);

  try {
    const serveUrl = await getBundleLocation();
    const inputProps = parsed.data;

    await runRender(isClientGone, async (browser) => {
      const composition = await selectComposition({
        serveUrl,
        id: "OoktoberPoster",
        inputProps,
        puppeteerInstance: browser,
      });

      await renderStill({
        composition,
        serveUrl,
        output: pngPath,
        inputProps,
        puppeteerInstance: browser,
        cancelSignal,
      });
    });

    if (isClientGone()) return;

    // Print-ready poster: convert the rendered artboard to CMYK (the color
    // space print shops expect, as opposed to the RGB the browser rendered
    // it in) and embed it in an A3 PDF page, edge to edge — the artboard's
    // own 3000x4240 aspect ratio already matches A3's (see constants.ts).
    await sharp(pngPath)
      .flatten({ background: "#ffffff" })
      .toColourspace("cmyk")
      .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
      .toFile(cmykJpegPath);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A3", margin: 0 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);
      doc.image(cmykJpegPath, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });

    if (isClientGone()) {
      removeFile(pdfPath);
      return;
    }
    scheduleExpiry(pdfFileName);
    res.json({ downloadUrl: `/api/download/${pdfFileName}` });
  } catch (err) {
    removeFile(pdfPath);
    sendRenderError(res, err, isClientGone, "Poster render failed.");
  } finally {
    removeFile(pngPath);
    removeFile(cmykJpegPath);
  }
});

app.get("/api/download/:file", (req, res) => {
  const fileName = path.basename(req.params.file);
  const filePath = path.join(OUT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  // One-shot link: the file is deleted as soon as the transfer ends
  // (successfully or not), so it never outlives its single download.
  clearTimeout(expiryTimers.get(fileName));
  expiryTimers.delete(fileName);
  res.download(filePath, () => removeFile(filePath));
});

// In production the built web tool (npm run app:build) is served from here
// too, so the site and the API share one origin. In dev, Vite serves it.
const APP_DIST = path.join(PROJECT_ROOT, "app-dist");
if (fs.existsSync(APP_DIST)) {
  app.use(express.static(APP_DIST));
}

app.listen(PORT, () => {
  console.log(`Ooktober render server listening on http://localhost:${PORT}`);
  // Build the Remotion bundle up front so the first visitor's render
  // doesn't pay for it.
  getBundleLocation().catch((err) => console.error(err));
});
