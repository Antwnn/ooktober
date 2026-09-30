import { z } from "zod";

// Site language — picks the localized background artwork (public/ref/V3/*-NL
// / *-FR) and the no-"o" fallback word ("oktober" / "octobre").
export const languageSchema = z.enum(["nl", "fr"]);
export type Language = z.infer<typeof languageSchema>;

export const ooktoberSchema = z.object({
  text: z.string(),
  language: languageSchema.optional(),
  // Manual overrides for the dynamic word. All optional — undefined falls
  // back to the calibrated defaults in constants.ts.
  margin: z.number().optional(),
  stretchPeak: z.number().optional(),
  sequenceDurationSeconds: z.number().optional(),
  easingOutPower: z.number().optional(),
  easingInPower: z.number().optional(),
});

export type OoktoberInputProps = z.infer<typeof ooktoberSchema>;

export type OoktoberResolvedProps = OoktoberInputProps & {
  displayText: string;
  insertIndex: number | null;
  hasAnimation: boolean;
  fontSize: number;
  // True when the raw input matched a profanity/insult in any supported
  // language — all text elements (word + both static captions) are hidden
  // while this is true.
  isBlocked: boolean;
  // True when the raw input has no "o" of its own to animate — displayText
  // above is then the fixed "oktober" -> "oOktober" (NL) / "octobre" ->
  // "oOctobre" (FR) reveal instead of the input, the background swaps to the
  // Not Detected artwork, and the raw input
  // itself is drawn as outline text (see OutlineWord.tsx).
  noODetected: boolean;
  // The outline word's glyph outlines as SVG path data, already fitted and
  // placed in canvas coordinates (see outlinePath.ts) — "" when not shown
  // (i.e. !noODetected or an empty/whitespace-only input).
  outlinePath: string;
  // The margin the animated word (fontSize above) was actually fit
  // against: the input's own `margin` normally, or FALLBACK_ANIM_MARGIN
  // when noODetected — since that fallback word is repositioned onto the
  // Not Detected artwork's dedicated spot instead of the usual slot (see resolveProps.ts / OoktoberComposition).
  wordMargin: number;
};

// The static poster (public/ref/V3/Poster-NL.svg / Poster-FR.svg) — no insertIndex/animation
// timing, since it shows the word in its settled, non-animated state.
export const posterSchema = z.object({
  text: z.string(),
  language: languageSchema.optional(),
});

export type PosterInputProps = z.infer<typeof posterSchema>;

export type PosterResolvedProps = PosterInputProps & {
  displayText: string;
  hasAnimation: boolean;
  fontSize: number;
  isBlocked: boolean;
};
