import { fitText, measureText } from "@remotion/layout-utils";
import {
  DYNAMIC_FONT_FAMILY,
  MAX_SIZE_REFERENCE_TEXT,
  WORD_LETTER_SPACING,
  WORD_LETTER_SPACING_EM,
  WORD_MARGIN,
  getWordMaxWidth,
} from "./constants";
import { fontsReady } from "./fonts";
import { getAnimatedText } from "./getAnimatedText";
import { OoktoberInputProps, OoktoberResolvedProps } from "./schema";

// Solves for the px letter-spacing that makes `text`'s *visible* span (not
// its CSS advance box) measure exactly `targetWidth` at `fontSize`.
// Chromium adds letter-spacing after every character, including the last
// — so an N-character string has N gaps in its advance width, but only
// N-1 of them sit between visible glyphs; the Nth is dead space past the
// final glyph. Two samples give the per-character gap size (=N, since the
// relationship is linear), and we solve using N-1 so the *glyphs* — not
// that trailing gap — end up spanning targetWidth.
function solveLetterSpacingForWidth(
  text: string,
  fontSize: number,
  targetWidth: number,
): number {
  const measure = (letterSpacing: string) =>
    measureText({
      text,
      fontFamily: DYNAMIC_FONT_FAMILY,
      fontSize,
      letterSpacing,
      validateFontIsLoaded: true,
    }).width;

  const w0 = measure("0px");
  const w10 = measure("10px");
  const charCount = (w10 - w0) / 10;
  if (charCount <= 1) return 0;
  return (targetWidth - w0) / (charCount - 1);
}

// Shared by the Remotion composition's calculateMetadata (Studio/render) and
// by the web tool's Player (browser), so both compute the exact same
// fontSize/displayText for a given input text.
export async function resolveOoktoberProps(
  input: OoktoberInputProps,
): Promise<OoktoberResolvedProps> {
  await fontsReady;

  const { text, margin = WORD_MARGIN } = input;
  const { hasAnimation, displayText, insertIndex } = getAnimatedText(text);
  const withinWidth = getWordMaxWidth(margin);

  // The word is always fit to exactly fill the current margin-to-margin
  // width, with the standard -7% tracking.
  const { fontSize: fittedFontSize } = fitText({
    text: displayText,
    withinWidth,
    fontFamily: DYNAMIC_FONT_FAMILY,
    letterSpacing: WORD_LETTER_SPACING,
    validateFontIsLoaded: true,
  });

  // ...but the font-size itself never grows past what an 8-character word
  // needs ("Roomaine" is also the original Fond.svg reference).
  const { fontSize: maxFontSize } = fitText({
    text: MAX_SIZE_REFERENCE_TEXT,
    withinWidth,
    fontFamily: DYNAMIC_FONT_FAMILY,
    letterSpacing: WORD_LETTER_SPACING,
    validateFontIsLoaded: true,
  });

  let fontSize: number;
  let letterSpacing: number;

  if (fittedFontSize <= maxFontSize) {
    fontSize = fittedFontSize;
    letterSpacing = WORD_LETTER_SPACING_EM * fontSize;
  } else {
    // The word is short enough that standard tracking would need a
    // font-size past the cap. Hold the font-size at the cap and widen the
    // tracking instead, so it still spans margin to margin.
    fontSize = maxFontSize;
    letterSpacing = solveLetterSpacingForWidth(displayText, fontSize, withinWidth);
  }

  return { ...input, displayText, insertIndex, hasAnimation, fontSize, letterSpacing };
}
