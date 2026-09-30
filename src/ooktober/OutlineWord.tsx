import React from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  OUTLINE_STROKE_COLOR,
  OUTLINE_STROKE_WIDTH,
} from "./constants";

type Props = {
  // SVG path data of the raw input's glyph outlines, already fitted and
  // placed in canvas coordinates by resolveProps.ts (see outlinePath.ts),
  // so the Player preview and the server render draw the same geometry.
  path: string;
};

// Draws the raw input as hollow/outline glyphs in the vertical column along
// the left edge — where the static "oktober" outline sits in the detected
// artwork. A <path> rather than SVG <text>: Safari (iOS) painted the text
// version with parts of the glyphs missing in the Player preview.
export const OutlineWord: React.FC<Props> = ({ path }) => {
  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0 }}
    >
      <path
        d={path}
        fill="none"
        stroke={OUTLINE_STROKE_COLOR}
        strokeWidth={OUTLINE_STROKE_WIDTH}
      />
    </svg>
  );
};
