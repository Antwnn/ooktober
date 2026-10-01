import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
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
  process.on(signal, () => process.exit(0));
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

// Every render launches its own headless Chrome, and each Chrome spawns
// dozens of threads. Several visitors rendering at once would exceed the
// container's thread limit, so renders wait their turn in a FIFO queue.
let activeRenders = 0;
const renderQueue: Array<() => void> = [];
const withRenderSlot = async <T>(task: () => Promise<T>): Promise<T> => {
  if (activeRenders >= MAX_PARALLEL_RENDERS) {
    await new Promise<void>((resolve) => renderQueue.push(resolve));
  } else {
    activeRenders++;
  }
  try {
    return await task();
  } finally {
    const next = renderQueue.shift();
    if (next) {
      next();
    } else {
      activeRenders--;
    }
  }
};

app.post("/api/render", async (req, res) => {
  const parsed = ooktoberSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.text.trim().length === 0) {
    res.status(400).json({ error: "A non-empty 'text' field is required." });
    return;
  }

  const fileName = `ooktober-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
  const outputLocation = path.join(OUT_DIR, fileName);

  try {
    const serveUrl = await getBundleLocation();
    const inputProps = parsed.data;

    await withRenderSlot(async () => {
      const composition = await selectComposition({
        serveUrl,
        id: COMPOSITION_ID,
        inputProps,
      });

      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation,
        inputProps,
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

    scheduleExpiry(fileName);
    res.json({ downloadUrl: `/api/download/${fileName}` });
  } catch (err) {
    console.error(err);
    removeFile(outputLocation);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Render failed.",
    });
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

  try {
    const serveUrl = await getBundleLocation();
    const inputProps = parsed.data;

    await withRenderSlot(async () => {
      const composition = await selectComposition({
        serveUrl,
        id: "OoktoberPoster",
        inputProps,
      });

      await renderStill({
        composition,
        serveUrl,
        output: pngPath,
        inputProps,
      });
    });

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

    scheduleExpiry(pdfFileName);
    res.json({ downloadUrl: `/api/download/${pdfFileName}` });
  } catch (err) {
    console.error(err);
    removeFile(pdfPath);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Poster render failed.",
    });
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
