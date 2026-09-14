import { fitText } from "@remotion/layout-utils";
import {
  DYNAMIC_FONT_FAMILY,
  WORD_LETTER_SPACING,
  WORD_MARGIN,
  getWordMaxWidth,
} from "./constants";
import { fontsReady } from "./fonts";
import { getAnimatedText } from "./getAnimatedText";
import { containsProfanity } from "./moderation";
import { OoktoberInputProps, OoktoberResolvedProps } from "./schema";

// Shared by the Remotion composition's calculateMetadata (Studio/render) and
// by the web tool's Player (browser), so both compute the exact same
// fontSize/displayText for a given input text.
export async function resolveOoktoberProps(
  input: OoktoberInputProps,
): Promise<OoktoberResolvedProps> {
  await fontsReady;

  const { text, margin = WORD_MARGIN } = input;
  const { hasAnimation, displayText, insertIndex } = getAnimatedText(text);

  // The word is always fit to exactly fill the current margin-to-margin
  // width — it touches both margins once settled, for any margin value.
  const { fontSize } = fitText({
    text: displayText,
    withinWidth: getWordMaxWidth(margin),
    fontFamily: DYNAMIC_FONT_FAMILY,
    letterSpacing: WORD_LETTER_SPACING,
    validateFontIsLoaded: true,
  });

  const isBlocked = containsProfanity(text);

  return { ...input, displayText, insertIndex, hasAnimation, fontSize, isBlocked };
}
