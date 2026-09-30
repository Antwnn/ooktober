import opentype from "opentype.js";
import { staticFile } from "remotion";
import { CANVAS_HEIGHT, WORD_LETTER_SPACING_EM } from "./constants";
import { DYNAMIC_FONT_FILE } from "./fonts";

// Arbitrary size to take the first measurement at — glyph outlines scale
// linearly with font-size, so the fitted size follows from one measurement.
const REFERENCE_SIZE = 1000;

let fontPromise: Promise<opentype.Font> | null = null;

const loadOutlineFont = () => {
  if (!fontPromise) {
    fontPromise = fetch(staticFile(DYNAMIC_FONT_FILE))
      .then((response) => response.arrayBuffer())
      .then((buffer) => opentype.parse(buffer));
    // Let the next call retry instead of caching the failure.
    fontPromise.catch(() => {
      fontPromise = null;
    });
  }
  return fontPromise;
};

// The raw input's glyph outlines as one SVG path, already placed in canvas
// coordinates: laid out horizontally, then rotated -90° into the vertical
// column along the left edge, sized so the ink spans exactly from the
// bottom margin to the top margin and its highest point (ascenders, or the
// x-height for a word without any) sits exactly on the left margin.
//
// Built from the font file's own outlines rather than drawn as SVG <text>:
// Safari (iOS) paints <text> at these sizes with whole parts of the glyphs
// missing in the Player preview. A plain <path> never goes through the
// browser's text engine, so the preview and the rendered video draw the
// exact same geometry everywhere. Returns "" when there's nothing to draw.
export async function buildOutlinePath(text: string, margin: number): Promise<string> {
  const lowerText = text.toLowerCase();
  if (lowerText.trim().length === 0) return "";

  const font = await loadOutlineFont();
  const options = { kerning: true, letterSpacing: WORD_LETTER_SPACING_EM };

  const reference = font.getPath(lowerText, 0, 0, REFERENCE_SIZE, options).getBoundingBox();
  const referenceWidth = reference.x2 - reference.x1;
  if (!(referenceWidth > 0)) return "";

  const verticalSpan = CANVAS_HEIGHT - margin * 2;
  const fontSize = (verticalSpan / referenceWidth) * REFERENCE_SIZE;
  const path = font.getPath(lowerText, 0, 0, fontSize, options);
  const box = path.getBoundingBox();

  // Same placement the old <text> used — translate(margin, height - margin)
  // rotate(-90) — applied to the ink's own tight box: its left edge becomes
  // the bottom edge, its top edge the left edge.
  const place = (x: number, y: number): [number, number] => [
    margin + (y - box.y1),
    CANVAS_HEIGHT - margin - (x - box.x1),
  ];
  const f = (n: number) => n.toFixed(2);
  const point = (x: number, y: number) => place(x, y).map(f).join(" ");

  return path.commands
    .map((command) => {
      switch (command.type) {
        case "M":
          return `M${point(command.x, command.y)}`;
        case "L":
          return `L${point(command.x, command.y)}`;
        case "C":
          return `C${point(command.x1, command.y1)} ${point(command.x2, command.y2)} ${point(command.x, command.y)}`;
        case "Q":
          return `Q${point(command.x1, command.y1)} ${point(command.x, command.y)}`;
        default:
          return "Z";
      }
    })
    .join("");
}
