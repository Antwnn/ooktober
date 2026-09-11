import { measureText } from "@remotion/layout-utils";
import React, { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
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
  WORD_SLOT_HEIGHT,
} from "./constants";

type Props = {
  displayText: string;
  insertIndex: number | null;
  hasAnimation: boolean;
  fontSize: number;
  // Resolved px letter-spacing (see resolveProps.ts — widened instead of
  // growing fontSize once the word hits the 8-character size cap).
  letterSpacing: number;
  // Manual overrides for the dynamic word — undefined falls back to the
  // calibrated defaults above.
  stretchPeak?: number;
  sequenceDurationSeconds?: number;
  easingOutPower?: number;
  easingInPower?: number;
};

type Overrides = {
  stretchPeak?: number;
  sequenceDurationSeconds?: number;
  easingOutPower?: number;
  easingInPower?: number;
};

type AnimationState = {
  scaleX: number;
  // 0 = anchored on the "o"'s right edge (not centered), 1 = block centered.
  centerBlend: number;
};

const useAnimationState = ({
  stretchPeak = SCALE_X_KEYFRAMES[1],
  sequenceDurationSeconds = SEQUENCE_DURATION_SECONDS,
  easingOutPower = EASING_OUT_POWER,
  easingInPower = EASING_IN_POWER,
}: Overrides): AnimationState => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const holdFrames = HOLD_DURATION_SECONDS * fps;
  const sequenceFrames = sequenceDurationSeconds * fps;
  const relativeFrame = frame - holdFrames;

  if (relativeFrame < 0) {
    // Before the trigger: "o" collapsed/invisible, block reads centered.
    return { scaleX: 0, centerBlend: 1 };
  }

  const keyframes = [SCALE_X_KEYFRAMES[0], stretchPeak, SCALE_X_KEYFRAMES[2]];
  const inputRange = SCALE_X_TIMES.map((t) => t * sequenceFrames);
  const peakFrame = inputRange[1];

  // Very-slow-in/very-slow-out around the stretch: quick to leave the
  // narrow state, decelerating smoothly into the peak (ease-out), then a
  // slow departure from the peak that quickly accelerates back into the
  // 100% rest state (ease-in). The velocity minimum sits right at the
  // peak itself, not at the segment edges.
  const scaleX = interpolate(relativeFrame, inputRange, keyframes, {
    easing: [Easing.out(Easing.poly(easingOutPower)), Easing.in(Easing.poly(easingInPower))],
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The block is anchored on the "o"'s right edge (not centered) from the
  // trigger through the stretch peak — like the reference video, it leans
  // left as the "o" grows. It only re-centers while the "o" relaxes from
  // the peak back to normal, landing exactly centered the instant it
  // settles.
  const centerBlend = interpolate(
    relativeFrame,
    [peakFrame, sequenceFrames],
    [0, 1],
    {
      easing: Easing.in(Easing.poly(easingInPower)),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return { scaleX, centerBlend };
};

const outerContainerStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  width: CANVAS_WIDTH,
  top: WORD_CENTER_Y - WORD_SLOT_HEIGHT / 2,
  height: WORD_SLOT_HEIGHT,
  display: "flex",
  alignItems: "center",
  // Horizontal position is fully controlled by translateX (computed per
  // frame), not by flex centering.
  justifyContent: "flex-start",
  overflow: "visible",
};

export const AnimatedWord: React.FC<Props> = ({
  displayText,
  insertIndex,
  hasAnimation,
  fontSize,
  letterSpacing,
  stretchPeak,
  sequenceDurationSeconds,
  easingOutPower,
  easingInPower,
}) => {
  const { scaleX, centerBlend } = useAnimationState({
    stretchPeak,
    sequenceDurationSeconds,
    easingOutPower,
    easingInPower,
  });

  const textStyle: React.CSSProperties = {
    fontFamily: DYNAMIC_FONT_FAMILY,
    fontWeight: 400,
    fontSize,
    color: TEXT_COLOR,
    letterSpacing: `${letterSpacing}px`,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const before = hasAnimation && insertIndex !== null ? displayText.slice(0, insertIndex) : "";
  const after = hasAnimation && insertIndex !== null ? displayText.slice(insertIndex + 1) : "";

  const { beforeWidth, oWidthBase, afterWidth, fullTextWidth } = useMemo(() => {
    const measure = (text: string) =>
      text.length === 0
        ? 0
        : measureText({
            text,
            fontFamily: DYNAMIC_FONT_FAMILY,
            fontSize,
            letterSpacing: `${letterSpacing}px`,
            validateFontIsLoaded: true,
          }).width;
    return {
      beforeWidth: hasAnimation ? measure(before) : 0,
      oWidthBase: hasAnimation ? measure("o") : 0,
      afterWidth: hasAnimation ? measure(after) : 0,
      fullTextWidth: measure(displayText),
    };
  }, [hasAnimation, before, after, displayText, fontSize, letterSpacing]);

  const canvasCenterX = CANVAS_WIDTH / 2;

  if (!hasAnimation || insertIndex === null) {
    // CSS letter-spacing adds a trailing gap after the last character too,
    // so the *advance* width (fullTextWidth) isn't the true ink width —
    // subtract one gap to center the actual glyphs, not that dead space.
    const inkWidth = fullTextWidth - letterSpacing;
    const left = canvasCenterX - inkWidth / 2;
    return (
      <div style={outerContainerStyle}>
        <span
          style={{
            ...textStyle,
            display: "inline-block",
            transform: `translateX(${left}px)`,
          }}
        >
          {displayText}
        </span>
      </div>
    );
  }

  const oWidthCurrent = oWidthBase * scaleX;
  // Same trailing-gap correction as above, applied to the whole assembled
  // word (before + o + after) so the block's *ink* — not its advance box
  // — is what ends up centered/anchored.
  const totalInkWidthCurrent = beforeWidth + oWidthCurrent + afterWidth - letterSpacing;
  const totalInkWidthAtSettle = beforeWidth + oWidthBase + afterWidth - letterSpacing;

  const centeredLeftAtSettle = canvasCenterX - totalInkWidthAtSettle / 2;
  // Fixed x of the "o"'s right edge — transform-origin (100% / right) —
  // derived so it lines up exactly with the centered, settled layout.
  const anchorX = centeredLeftAtSettle + beforeWidth + oWidthBase;

  const anchoredLeft = anchorX - beforeWidth - oWidthCurrent;
  const centeredLeft = canvasCenterX - totalInkWidthCurrent / 2;
  const blockLeft = anchoredLeft * (1 - centerBlend) + centeredLeft * centerBlend;

  return (
    <div style={outerContainerStyle}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          transform: `translateX(${blockLeft}px)`,
        }}
      >
        <span style={textStyle}>{before}</span>
        {/* The outer span's width is the "o"'s real (current) layout
            width, so "after" flows right after wherever the "o" currently
            ends — no separate position math needed for it. The inner span
            renders the glyph at its natural width and is visually squeezed
            to fit via scaleX, anchored on its left edge (which is where
            the sizer places it) so the two stay in sync every frame. */}
        <span
          style={{
            display: "inline-block",
            width: oWidthCurrent,
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
        <span style={textStyle}>{after}</span>
      </div>
    </div>
  );
};
