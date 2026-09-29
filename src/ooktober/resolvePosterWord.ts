import {
  DYNAMIC_FONT_FAMILY,
  POSTER_CANVAS_WIDTH,
  POSTER_WORD_MARGIN_LEFT,
  POSTER_WORD_MARGIN_RIGHT,
  POSTER_WORD_MAX_FONT_SIZE,
  WORD_LETTER_SPACING_EM,
} from "./constants";
import { fontsReady } from "./fonts";
import { getAnimatedText } from "./getAnimatedText";
import { measureInk } from "./measureInk";
import { containsProfanity } from "./moderation";
import { PosterInputProps, PosterResolvedProps } from "./schema";

const FIT_REFERENCE_SIZE = 100;

// Mirrors resolveOoktoberProps' margin-to-margin ink fitting (see
// resolveProps.ts) but against the poster artboard's own dimensions and
// margins instead of the video canvas's — shared by the web tool's live
// preview and the server-side renderStill call behind the PDF download, so
// both compute the exact same fontSize/displayText for a given input. The
// poster has no animation, so there's no insertIndex to resolve, just the
// settled displayText.
export async function resolvePosterWord(
  input: PosterInputProps,
): Promise<PosterResolvedProps> {
  await fontsReady;

  const { text } = input;
  const { hasAnimation, displayText } = getAnimatedText(text);

  const availableSpan =
    POSTER_CANVAS_WIDTH - POSTER_WORD_MARGIN_LEFT - POSTER_WORD_MARGIN_RIGHT;
  const reference = measureInk(
    displayText,
    DYNAMIC_FONT_FAMILY,
    FIT_REFERENCE_SIZE,
    WORD_LETTER_SPACING_EM,
  );
  const fittedFontSize = (availableSpan / reference.inkWidth) * FIT_REFERENCE_SIZE;
  const fontSize = Math.min(fittedFontSize, POSTER_WORD_MAX_FONT_SIZE);

  const isBlocked = containsProfanity(text) || containsProfanity(displayText);

  return { ...input, displayText, hasAnimation, fontSize, isBlocked };
}
