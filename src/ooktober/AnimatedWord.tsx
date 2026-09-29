import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  AFTER_REACTION_STRENGTH,
  DYNAMIC_FONT_FAMILY,
  EASING_IN_POWER,
  EASING_OUT_POWER,
  HOLD_DURATION_SECONDS,
  SCALE_X_KEYFRAMES,
  SCALE_X_TIMES,
  SEQUENCE_DURATION_SECONDS,
  TEXT_COLOR,
  WORD_BASELINE_RATIO,
  WORD_BASELINE_Y,
  WORD_LETTER_SPACING,
  WORD_LETTER_SPACING_AFTER_O,
  WORD_LETTER_SPACING_AFTER_O_EM,
  WORD_LETTER_SPACING_EM,
  WORD_MARGIN,
} from "./constants";
import { measureInk, measureSplitWordInk } from "./measureInk";

type Props = {
  displayText: string;
  insertIndex: number | null;
  hasAnimation: boolean;
  fontSize: number;
  // Manual overrides for the dynamic word — undefined falls back to the
  // calibrated defaults above.
  margin?: number;
  // Overrides WORD_BASELINE_Y — used to reposition the word onto Not
  // Detected-Bis.svg's baked watermark spot in the no-"o" fallback (see
  // OoktoberComposition), instead of the usual fixed baseline.
  baselineY?: number;
  // Overrides TEXT_COLOR — the no-"o" fallback word is drawn in
  // TEXT_COLOR_NOT_DETECTED on its white background (see OoktoberComposition).
  color?: string;
  stretchPeak?: number;
  sequenceDurationSeconds?: number;
  easingOutPower?: number;
  easingInPower?: number;
};

type ScaleXOverrides = {
  stretchPeak?: number;
  sequenceDurationSeconds?: number;
  easingOutPower?: number;
  easingInPower?: number;
};

const useScaleX = ({
  stretchPeak = SCALE_X_KEYFRAMES[1],
  sequenceDurationSeconds = SEQUENCE_DURATION_SECONDS,
  easingOutPower = EASING_OUT_POWER,
  easingInPower = EASING_IN_POWER,
}: ScaleXOverrides) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const holdFrames = HOLD_DURATION_SECONDS * fps;
  const sequenceFrames = sequenceDurationSeconds * fps;
  const relativeFrame = frame - holdFrames;

  if (relativeFrame < 0) {
    // During the hold, the duplicated "o" stays collapsed/invisible so the
    // word reads exactly like its original (non-duplicated) form.
    return 0;
  }

  const keyframes = [SCALE_X_KEYFRAMES[0], stretchPeak, SCALE_X_KEYFRAMES[2]];
  const inputRange = SCALE_X_TIMES.map((t) => t * sequenceFrames);

  // Very-slow-in/very-slow-out around the stretch: quick to leave the
  // narrow state, decelerating smoothly into the peak (ease-out), then a
  // slow departure from the peak that quickly accelerates back into the
  // 100% rest state (ease-in). The velocity minimum sits right at the
  // peak itself, not at the segment edges.
  return interpolate(relativeFrame, inputRange, keyframes, {
    easing: [Easing.out(Easing.poly(easingOutPower)), Easing.in(Easing.poly(easingInPower))],
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// Right-anchored and pinned to a fixed baseline. `width` is the block's
// current (possibly mid-animation) *advance* width, computed explicitly in
// JS rather than left to the browser's own shrink-to-fit — that auto-width
// pass turned out to be unreliable for an absolutely-positioned flex
// container in the renderer, letting the block overflow past the canvas
// edge. `rightOffset` is `margin` plus however far the word's painted ink
// overshoots past its own advance box on the right (see measureInk.ts) —
// without it, that overshoot (e.g. the trailing "e"'s curl) would paint
// past the margin even though the advance box itself stops exactly at it.
// Together they place the box so the *ink*, not just the advance box,
// stops exactly at the right margin — and it stays there as the duplicated
// "o" deforms the block's width, since only the (left-side) content shifts.
// `top` is derived from the font's own ascent/descent ratio
// (WORD_BASELINE_RATIO) so the baseline itself lands on WORD_BASELINE_Y
// regardless of fontSize.
const getWordContainerStyle = (
  rightOffset: number,
  fontSize: number,
  width: number,
  baselineY: number,
): React.CSSProperties => ({
  position: "absolute",
  right: rightOffset,
  top: baselineY - fontSize * WORD_BASELINE_RATIO,
  width,
  overflow: "visible",
});

export const AnimatedWord: React.FC<Props> = ({
  displayText,
  insertIndex,
  hasAnimation,
  fontSize,
  margin = WORD_MARGIN,
  baselineY = WORD_BASELINE_Y,
  color = TEXT_COLOR,
  stretchPeak,
  sequenceDurationSeconds,
  easingOutPower,
  easingInPower,
}) => {
  const scaleX = useScaleX({
    stretchPeak,
    sequenceDurationSeconds,
    easingOutPower,
    easingInPower,
  });

  const textStyle: React.CSSProperties = {
    fontFamily: DYNAMIC_FONT_FAMILY,
    fontWeight: 400,
    fontSize,
    color,
    letterSpacing: WORD_LETTER_SPACING,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  // The full (settled, scaleX === 1) word's ink metrics — used only for the
  // non-animated rendering below, measured as one uniformly-spaced string.
  const fullTextInk = useMemo(
    () => measureInk(displayText, DYNAMIC_FONT_FAMILY, fontSize, WORD_LETTER_SPACING_EM),
    [displayText, fontSize],
  );

  if (!hasAnimation || insertIndex === null) {
    const rightOffset = margin + fullTextInk.overshootRight;
    const wordContainerStyle = getWordContainerStyle(
      rightOffset,
      fontSize,
      fullTextInk.advanceWidth,
      baselineY,
    );
    return (
      <div style={wordContainerStyle}>
        <span style={textStyle}>{displayText}</span>
      </div>
    );
  }

  const before = displayText.slice(0, insertIndex);
  const after = displayText.slice(insertIndex + 1);

  // Measured piecewise (rather than as one uniformly-spaced string) so the
  // gap right after the duplicated "O" can use its own, tighter,
  // letter-spacing (WORD_LETTER_SPACING_AFTER_O_EM) — mirrors the fitting
  // resolveProps.ts did for this same word, so the settled state below
  // still touches the margin exactly.
  const splitInk = useMemo(
    () =>
      measureSplitWordInk(
        before,
        after,
        DYNAMIC_FONT_FAMILY,
        fontSize,
        WORD_LETTER_SPACING_EM,
        WORD_LETTER_SPACING_AFTER_O_EM,
      ),
    [before, after, fontSize],
  );
  const oWidth = splitInk.oWidth;
  const rightOffset = margin + splitInk.overshootRight;

  // A tiny reaction on the letters right after the "o" during the overshoot
  // peak, settling back in sync with the "o" itself.
  const afterScale = 1 + AFTER_REACTION_STRENGTH * Math.max(0, scaleX - 1);

  // The "O" is the only part of the word whose width changes frame to
  // frame (via scaleX) — the current total width is the settled width plus
  // however far the "O" currently deviates from its own settled (scaleX 1)
  // width.
  const currentWidth = splitInk.advanceWidth + oWidth * (scaleX - 1);
  const wordContainerStyle = getWordContainerStyle(rightOffset, fontSize, currentWidth, baselineY);

  return (
    <div style={wordContainerStyle}>
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "baseline" }}
      >
        <span style={textStyle}>{before}</span>
        {/* The outer span's width is the "O"'s real (current) layout width,
            so the row's total width genuinely changes as it deforms — and
            since the outer container is right-anchored (`right:
            rightOffset`, no explicit width), that reflow only ever pushes
            the left edge around, never the right margin. The inner span
            renders the glyph at its natural width and is visually squeezed
            to fit via scaleX, anchored on its left edge (which is where
            the sizer places it) so the two stay in sync every frame. The
            duplicated letter is always a capital "O", regardless of case
            elsewhere in the word. */}
        <span
          style={{
            display: "inline-block",
            width: oWidth * scaleX,
            overflow: "visible",
          }}
        >
          <span
            style={{
              ...textStyle,
              letterSpacing: WORD_LETTER_SPACING_AFTER_O,
              display: "inline-block",
              transformOrigin: "0% 50%",
              transform: `scaleX(${scaleX})`,
            }}
          >
            O
          </span>
        </span>
        <span
          style={{
            ...textStyle,
            display: "inline-block",
            transformOrigin: "0% 50%",
            // scaleX only — a uniform scale() here would also stretch Y,
            // and since transformOrigin is vertically centered on the
            // glyph box (not on the baseline), that visibly shifts the
            // text off the baseline as afterScale changes over the frame.
            transform: `scaleX(${afterScale})`,
          }}
        >
          {after}
        </span>
      </div>
    </div>
  );
};
