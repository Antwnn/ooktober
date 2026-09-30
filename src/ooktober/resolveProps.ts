import {
  CANVAS_WIDTH,
  DYNAMIC_FONT_FAMILY,
  FALLBACK_ANIM_MARGIN,
  FALLBACK_ANIM_MAX_FONT_SIZE,
  WORD_LETTER_SPACING_AFTER_O_EM,
  WORD_LETTER_SPACING_EM,
  WORD_MARGIN,
  WORD_MAX_FONT_SIZE,
} from "./constants";
import { fontsReady } from "./fonts";
import { getAnimatedText } from "./getAnimatedText";
import { measureInk, measureSplitWordInk } from "./measureInk";
import { containsProfanity } from "./moderation";
import { buildOutlinePath } from "./outlinePath";
import { Language, OoktoberInputProps, OoktoberResolvedProps } from "./schema";

// Arbitrary reference size to measure ink metrics at — font metrics scale
// linearly with font-size, so the fitted size can be derived directly from
// a single measurement instead of iterating/bisecting.
const FIT_REFERENCE_SIZE = 100;

// What actually animates whenever the raw input has no "o" of its own —
// getAnimatedText resolves these to the "oOktober" / "oOctobre" reveal
// (single "o" at index 0), same reveal the word gets when a name happens to
// start with one.
const FALLBACK_WORDS: Record<Language, string> = {
  nl: "oktober",
  fr: "octobre",
};

// Shared by the Remotion composition's calculateMetadata (Studio/render) and
// by the web tool's Player (browser), so both compute the exact same
// fontSize/displayText for a given input text.
export async function resolveOoktoberProps(
  input: OoktoberInputProps,
): Promise<OoktoberResolvedProps> {
  await fontsReady;

  const { text, margin = WORD_MARGIN, language = "nl" } = input;
  const original = getAnimatedText(text);

  // No "o" in the raw input to animate: the animated word falls back to
  // "oktober" (-> "oOktober") / "octobre" (-> "oOctobre") instead, and the
  // raw input itself is shown as outline text in the background (see
  // OutlineWord.tsx) — the animation itself doesn't move or change, just
  // which word feeds it.
  const noODetected = !original.hasAnimation;
  const { hasAnimation, displayText, insertIndex } = noODetected
    ? getAnimatedText(FALLBACK_WORDS[language])
    : original;

  // The word is fit to exactly fill the current margin-to-margin width with
  // its *painted ink* (not just its CSS advance box — see measureInk.ts) —
  // it touches both margins once settled — but never grows past a max
  // size. Short words that would otherwise need a bigger size stop there
  // and stay glued to the right margin only (see AnimatedWord's `right:
  // margin` anchor). In the no-"o" fallback, this fits against
  // FALLBACK_ANIM_MARGIN instead of the input's own margin, since the word
  // is repositioned onto the Not Detected artwork's dedicated spot
  // rather than the usual slot (see OoktoberComposition).
  const wordMargin = noODetected ? FALLBACK_ANIM_MARGIN : margin;
  const wordMaxFontSize = noODetected ? FALLBACK_ANIM_MAX_FONT_SIZE : WORD_MAX_FONT_SIZE;
  const availableSpan = CANVAS_WIDTH - wordMargin * 2;
  // When the word animates, it's actually painted split around the
  // duplicated "O" with a tighter gap right after it (see AnimatedWord) —
  // fitting must measure it the same way, or the settled word would fall
  // just short of the margins it's meant to touch exactly.
  const reference =
    hasAnimation && insertIndex !== null
      ? measureSplitWordInk(
          displayText.slice(0, insertIndex),
          displayText.slice(insertIndex + 1),
          DYNAMIC_FONT_FAMILY,
          FIT_REFERENCE_SIZE,
          WORD_LETTER_SPACING_EM,
          WORD_LETTER_SPACING_AFTER_O_EM,
        )
      : measureInk(displayText, DYNAMIC_FONT_FAMILY, FIT_REFERENCE_SIZE, WORD_LETTER_SPACING_EM);
  const fittedFontSize = (availableSpan / reference.inkWidth) * FIT_REFERENCE_SIZE;
  const fontSize = Math.min(fittedFontSize, wordMaxFontSize);

  // The raw input's own outline, drawn in the background of the no-"o"
  // state. Unlike the main word it has no max-size cap: it always touches
  // the top, bottom and left margins, whatever the input's length.
  const outlinePath = noODetected ? await buildOutlinePath(text, margin) : "";

  // Check both the raw input and the actual displayed word — some words
  // (e.g. "bobs") are clean on their own but become offensive once the
  // "o" is duplicated ("boobs"). The outline text is always the raw input
  // itself, so containsProfanity(text) already covers it.
  const isBlocked = containsProfanity(text) || containsProfanity(displayText);

  return {
    ...input,
    displayText,
    insertIndex,
    hasAnimation,
    fontSize,
    isBlocked,
    noODetected,
    outlinePath,
    wordMargin,
  };
}
