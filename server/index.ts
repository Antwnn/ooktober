import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { ooktoberSchema } from "../src/ooktober/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "out");
const COMPOSITION_ID = "OoktoberWord";
const PORT = Number(process.env.PORT) || 3001;

fs.mkdirSync(OUT_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());

// The Remotion bundle only needs to be built once; every render reuses it.
let bundleLocationPromise: Promise<string> | null = null;
const getBundleLocation = () => {
  if (!bundleLocationPromise) {
    bundleLocationPromise = bundle({
      entryPoint: path.join(PROJECT_ROOT, "src/index.ts"),
      onProgress: () => {},
    });
  }
  return bundleLocationPromise;
};

app.post("/api/render", async (req, res) => {
  const parsed = ooktoberSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.text.trim().length === 0) {
    res.status(400).json({ error: "A non-empty 'text' field is required." });
    return;
  }

  try {
    const serveUrl = await getBundleLocation();
    const inputProps = parsed.data;

    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
    });

    const fileName = `ooktober-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`;
    const outputLocation = path.join(OUT_DIR, fileName);

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
    });

    res.json({ downloadUrl: `/api/download/${fileName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Render failed.",
    });
  }
});

app.get("/api/download/:file", (req, res) => {
  const fileName = path.basename(req.params.file);
  const filePath = path.join(OUT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`Ooktober render server listening on http://localhost:${PORT}`);
});
