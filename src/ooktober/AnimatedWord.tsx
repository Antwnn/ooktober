import { measureText } from "@remotion/layout-utils";
import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  AFTER_REACTION_STRENGTH,
  CANVAS_WIDTH,
  DYNAMIC_FONT_FAMILY,
  EASING_IN_POWER,
  EASING_OUT_POWER,
  HOLD_DURATION_SECONDS,
  SCALE_X_KEYFRAMES,
  SCALE_X_TIMES,
  SEQUENCE_DURATION_SECONDS,
  TEXT_COLOR,
  WORD_CENTER_Y,
  WORD_LETTER_SPACING,
  WORD_MARGIN,
  WORD_SLOT_HEIGHT,
} from "./constants";

type Props = {
  displayText: string;
  insertIndex: number | null;
  hasAnimation: boolean;
  fontSize: number;
  // Manual overrides for the dynamic word — undefined falls back to the
  // calibrated defaults above.
  margin?: number;
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

const getWordContainerStyle = (margin: number): React.CSSProperties => ({
  position: "absolute",
  left: margin,
  width: CANVAS_WIDTH - margin * 2,
  top: WORD_CENTER_Y - WORD_SLOT_HEIGHT / 2,
  height: WORD_SLOT_HEIGHT,
  display: "flex",
  alignItems: "center",
  // The whole word block (including the duplicated "o" mid-animation) stays
  // centered: the "o"'s current width is a real layout width (not just a
  // transform), so the flex row's own width genuinely changes as it
  // deforms, and centering follows it automatically every frame.
  justifyContent: "center",
  overflow: "visible",
});

export const AnimatedWord: React.FC<Props> = ({
  displayText,
  insertIndex,
  hasAnimation,
  fontSize,
  margin = WORD_MARGIN,
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
  const wordContainerStyle = getWordContainerStyle(margin);

  const textStyle: React.CSSProperties = {
    fontFamily: DYNAMIC_FONT_FAMILY,
    fontWeight: 400,
    fontSize,
    color: TEXT_COLOR,
    letterSpacing: WORD_LETTER_SPACING,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const oWidth = useMemo(() => {
    if (!hasAnimation) return 0;
    return measureText({
      text: "o",
      fontFamily: DYNAMIC_FONT_FAMILY,
      fontSize,
      letterSpacing: WORD_LETTER_SPACING,
      validateFontIsLoaded: true,
    }).width;
  }, [hasAnimation, fontSize]);

  if (!hasAnimation || insertIndex === null) {
    return (
      <div style={wordContainerStyle}>
        <span style={textStyle}>{displayText}</span>
      </div>
    );
  }

  const before = displayText.slice(0, insertIndex);
  const after = displayText.slice(insertIndex + 1);

  // A tiny reaction on the letters right after the "o" during the overshoot
  // peak, settling back in sync with the "o" itself.
  const afterScale = 1 + AFTER_REACTION_STRENGTH * Math.max(0, scaleX - 1);

  return (
    <div style={wordContainerStyle}>
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "baseline" }}
      >
        <span style={textStyle}>{before}</span>
        {/* The outer span's width is the "o"'s real (current) layout width,
            so the row reflows and re-centers as it deforms. The inner span
            renders the glyph at its natural width and is visually squeezed
            to fit via scaleX, anchored on its left edge (which is where the
            sizer places it) so the two stay in sync every frame. */}
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
              display: "inline-block",
              transformOrigin: "0% 50%",
              transform: `scaleX(${scaleX})`,
            }}
          >
            o
          </span>
        </span>
        <span
          style={{
            ...textStyle,
            display: "inline-block",
            transformOrigin: "0% 50%",
            transform: `scale(${afterScale})`,
          }}
        >
          {after}
        </span>
      </div>
    </div>
  );
};
