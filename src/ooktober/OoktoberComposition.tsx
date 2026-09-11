import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedWord } from "./AnimatedWord";
import { BACKGROUND_COLOR } from "./constants";
import { StaticCaptions } from "./StaticCaptions";
import { OoktoberResolvedProps } from "./schema";

// A single pass (hold + duplicated-"o" animation + settle). Looping is a
// playback concern, handled by the <Player loop autoPlay> in the web tool,
// not baked into the exported video itself.
export const OoktoberComposition: React.FC<OoktoberResolvedProps> = ({
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
  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR }}>
      <StaticCaptions />
      <AnimatedWord
        displayText={displayText}
        insertIndex={insertIndex}
        hasAnimation={hasAnimation}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        stretchPeak={stretchPeak}
        sequenceDurationSeconds={sequenceDurationSeconds}
        easingOutPower={easingOutPower}
        easingInPower={easingInPower}
      />
    </AbsoluteFill>
  );
};
