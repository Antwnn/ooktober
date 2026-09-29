import React, { useMemo } from "react";
import { staticFile } from "remotion";
import {
  DYNAMIC_FONT_FAMILY,
  POSTER_CANVAS_HEIGHT,
  POSTER_CANVAS_WIDTH,
  POSTER_TEXT_COLOR,
  POSTER_WORD_BASELINE_Y,
  POSTER_WORD_MARGIN_RIGHT,
  WORD_LETTER_SPACING_EM,
} from "./constants";
import { measureInk } from "./measureInk";
import { PosterResolvedProps } from "./schema";

// Shared by the web tool's live preview (app/PosterPreview.tsx) and the
// server-side renderStill call behind the PDF download, so the downloaded
// poster always matches what was previewed. An inline SVG lets the word be
// laid out in the same 3000x4240 user-space coordinates as the localized
// background (public/ref/V3/Poster-NL.svg / Poster-FR.svg), so it scales
// together with it at any output size.
// `text-anchor="end"` keeps the word glued to the right margin the
// placeholder word occupied, matching the video's right-anchored layout
// (see AnimatedWord.tsx) — including its `overshootRight` correction:
// resolvePosterWord.ts fits fontSize so the *ink* (not the advance box)
// spans the margin-to-margin width, so without shifting the anchor left by
// however far this specific text's ink overshoots past its own advance box
// on the right, that overshoot would push past the right margin and throw
// the left edge off by the same amount.
export const PosterComposition: React.FC<PosterResolvedProps> = ({
  displayText,
  fontSize,
  isBlocked,
  language = "nl",
}) => {
  const overshootRight = useMemo(
    () =>
      measureInk(displayText, DYNAMIC_FONT_FAMILY, fontSize, WORD_LETTER_SPACING_EM)
        .overshootRight,
    [displayText, fontSize],
  );

  return (
    <svg
      viewBox={`0 0 ${POSTER_CANVAS_WIDTH} ${POSTER_CANVAS_HEIGHT}`}
      width="100%"
      height="100%"
    >
      <image
        href={staticFile(`ref/V3/Poster-${language === "fr" ? "FR" : "NL"}.svg`)}
        x={0}
        y={0}
        width={POSTER_CANVAS_WIDTH}
        height={POSTER_CANVAS_HEIGHT}
      />
      {!isBlocked && (
        <text
          x={POSTER_CANVAS_WIDTH - POSTER_WORD_MARGIN_RIGHT - overshootRight}
          y={POSTER_WORD_BASELINE_Y}
          textAnchor="end"
          fontFamily={DYNAMIC_FONT_FAMILY}
          fontWeight={400}
          fontSize={fontSize}
          fill={POSTER_TEXT_COLOR}
          style={{ letterSpacing: `${WORD_LETTER_SPACING_EM}em` }}
        >
          {displayText}
        </text>
      )}
    </svg>
  );
};
