import {
  EASING_IN_POWER,
  EASING_OUT_POWER,
  SCALE_X_KEYFRAMES,
  SEQUENCE_DURATION_SECONDS,
  WORD_MARGIN,
} from "../src/ooktober/constants";

export type AnimationSettings = {
  margin: number;
  stretchPeak: number;
  sequenceDurationSeconds: number;
  easingOutPower: number;
  easingInPower: number;
};

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  margin: WORD_MARGIN,
  stretchPeak: SCALE_X_KEYFRAMES[1],
  sequenceDurationSeconds: SEQUENCE_DURATION_SECONDS,
  easingOutPower: EASING_OUT_POWER,
  easingInPower: EASING_IN_POWER,
};
