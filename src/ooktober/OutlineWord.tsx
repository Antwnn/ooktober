import React, { useMemo } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DYNAMIC_FONT_FAMILY,
  OUTLINE_STROKE_COLOR,
  OUTLINE_STROKE_WIDTH,
  WORD_LETTER_SPACING_EM,
  WORD_MARGIN,
} from "./constants";
import { measureInkBox } from "./measureInk";

type Props = {
  text: string;
  // Pre-fitted in resolveProps.ts so the Player preview and the server
  // render always agree pixel-for-pixel, same as the main animated word.
  fontSize: number;
  margin?: number;
};

// Draws the raw input as hollow/outline glyphs, laid out horizontally in
// their own local coordinate space and rotated -90° into the vertical
// column along the left edge — exactly where the static "oktober" outline
// used to sit in public/ref/V2/Detected.svg (clip1: 1880x430,
// translate(20 1900) rotate(-90)). `fontSize` is fit (in resolveProps.ts)
// so the ink, once rotated, spans exactly from the top margin to the
// bottom margin; `x`/`y` below are derived from this exact text's tight ink
// box (see measureInkBox), so the *ink* (not the glyphs' advance/line
// boxes) lands exactly on the margins whatever letters it contains:
//   - local x = ink.left, so the first glyph's ink (which the rotation
//     turns into the *bottom* edge) starts exactly at the margin, whether
//     it overshoots its advance box or starts inside it.
//   - local y = ink.ascent, so the highest painted pixel of *this* text
//     (which the rotation turns into the *left* edge) sits exactly at the
//     left margin — e.g. the x-height for "emma", the ascenders for "lola"
//     — with only descenders extending further right.
export const OutlineWord: React.FC<Props> = ({ text, fontSize, margin = WORD_MARGIN }) => {
  const lowerText = text.toLowerCase();

  const ink = useMemo(
    () => measureInkBox(lowerText, DYNAMIC_FONT_FAMILY, fontSize, WORD_LETTER_SPACING_EM),
    [lowerText, fontSize],
  );

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      width="100%"
      height="100%"
      // Own compositing layer: Safari invalidates SVG text by its font
      // metric boxes, not its painted ink, and this font's ink reaches well
      // outside them at these sizes — repaints of the shared layer (the
      // animated word, a text change) left parts of the outline unpainted
      // and stale pieces of the previous one behind in the Player preview.
      style={{ position: "absolute", inset: 0, willChange: "transform" }}
    >
      <text
        transform={`translate(${margin} ${CANVAS_HEIGHT - margin}) rotate(-90)`}
        x={ink.left}
        y={ink.ascent}
        fontFamily={DYNAMIC_FONT_FAMILY}
        fontWeight={400}
        fontSize={fontSize}
        fill="none"
        stroke={OUTLINE_STROKE_COLOR}
        strokeWidth={OUTLINE_STROKE_WIDTH}
        style={{ letterSpacing: `${WORD_LETTER_SPACING_EM}em` }}
      >
        {lowerText}
      </text>
    </svg>
  );
};
