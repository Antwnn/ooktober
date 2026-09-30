import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AnimatedWord } from "./AnimatedWord";
import {
  BACKGROUND_COLOR,
  FALLBACK_ANIM_BASELINE_Y,
  TEXT_COLOR,
  TEXT_COLOR_NOT_DETECTED,
  WORD_BASELINE_Y,
} from "./constants";
import { OutlineWord } from "./OutlineWord";
import { OoktoberResolvedProps } from "./schema";

// A single pass (hold + duplicated-"o" animation + settle). Looping is a
// playback concern, handled by the <Player loop autoPlay> in the web tool,
// not baked into the exported video itself.
export const OoktoberComposition: React.FC<OoktoberResolvedProps> = ({
  displayText,
  insertIndex,
  hasAnimation,
  fontSize,
  wordMargin,
  stretchPeak,
  sequenceDurationSeconds,
  easingOutPower,
  easingInPower,
  isBlocked,
  noODetected,
  outlinePath,
  language = "nl",
}) => {
  // An insult/profane word in the input hides every text element — only
  // the background stays — until the text is changed to something clean.
  if (isBlocked) {
    return <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR }} />;
  }

  // The full scene (background + static captions + "think pink" icon) is
  // exported as one flat reference image per state and per language.
  // Whenever the raw input has no "o" of its own, the animated word falls
  // back to "oktober" / "octobre" (see resolveProps.ts), gets repositioned
  // (via wordMargin/baselineY below) and the background swaps to the no-"o"
  // variant, with the input's own outline (OutlineWord) drawn on top.
  const suffix = language === "fr" ? "FR" : "NL";
  const backgroundSrc = noODetected
    ? staticFile(`ref/V3/Not Detected-${suffix}.svg`)
    : staticFile(`ref/V3/Detected-${suffix}.svg`);

  return (
    // Layering (back to front): the flat reference background, the input's
    // own outline (only in the no-"o" state), then the animated word.
    <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR }}>
      <AbsoluteFill>
        <Img src={backgroundSrc} style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
      {noODetected && outlinePath && <OutlineWord path={outlinePath} />}
      <AnimatedWord
        displayText={displayText}
        insertIndex={insertIndex}
        hasAnimation={hasAnimation}
        fontSize={fontSize}
        margin={wordMargin}
        baselineY={noODetected ? FALLBACK_ANIM_BASELINE_Y : WORD_BASELINE_Y}
        color={noODetected ? TEXT_COLOR_NOT_DETECTED : TEXT_COLOR}
        stretchPeak={stretchPeak}
        sequenceDurationSeconds={sequenceDurationSeconds}
        easingOutPower={easingOutPower}
        easingInPower={easingInPower}
      />
    </AbsoluteFill>
  );
};
