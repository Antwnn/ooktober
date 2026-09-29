// Calibrated from public/ref/Fond.svg (1080x1920 artboard) and public/font/OOKTOBER-Regular.otf.

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;
export const FPS = 30;
export const TOTAL_DURATION_SECONDS = 4;
export const TOTAL_DURATION_FRAMES = Math.round(TOTAL_DURATION_SECONDS * FPS);

export const BACKGROUND_COLOR = "#E34C81";
// Animated word color when a duplicable "o" is detected (pink background,
// public/ref/V3/Detected-NL.svg / Detected-FR.svg).
export const TEXT_COLOR = "#F3ACC1";
// Animated word color when no "o" is detected (white background,
// public/ref/V3/Not Detected-NL.svg / Not Detected-FR.svg).
export const TEXT_COLOR_NOT_DETECTED = "#E34C81";

// The dynamic word uses the local display font shipped in public/font.
export const DYNAMIC_FONT_FAMILY = "OOKTOBER";

// --- Dynamic word -----------------------------------------------------
// Default margin (Figma node 28:1033), adjustable at runtime via the web
// tool's settings panel (passed through as the "margin" prop). The word is
// always anchored on the right margin (see AnimatedWord's `right: margin`)
// and its font-size is fit so it also touches the left margin — until it
// hits WORD_MAX_FONT_SIZE, at which point it stops growing and just sits
// glued to the right margin with a gap on the left.
export const WORD_MARGIN = 40;
// The word's font-size never exceeds this, however short it is — beyond it
// the word stops growing and stays right-anchored instead of stretching to
// also touch the left margin.
export const WORD_MAX_FONT_SIZE = 450;
// Fitting (see resolveProps.ts) and positioning (see AnimatedWord.tsx) both
// measure the actual painted ink extent (via measureInk.ts / Canvas2D),
// not just the CSS advance box — OOKTOBER-Regular paints outside its
// advance box (e.g. the trailing "e" overshoots past its own advance
// width), and at these tight margins that overshoot alone is enough to
// visibly clip past the edge if left unaccounted for.
export const WORD_LETTER_SPACING_EM = 0.03;
export const WORD_LETTER_SPACING = `${WORD_LETTER_SPACING_EM}em`;
// Tighter spacing applied only to the gap right after the duplicated "O"
// (e.g. the "o"/"i" gap in "antOOine") — every other letter pair, including
// the gap between the two "o"s themselves, keeps WORD_LETTER_SPACING_EM.
// Adjust this value alone to dial that one gap in/out (see
// measureSplitWordInk in measureInk.ts for how it's applied).
export const WORD_LETTER_SPACING_AFTER_O_EM = -0.01;
export const WORD_LETTER_SPACING_AFTER_O = `${WORD_LETTER_SPACING_AFTER_O_EM}em`;
// Fraction of the font-size, measured down from the top of a `line-height:
// 1` line box, at which the baseline sits — a fixed, font-intrinsic ratio
// (derived from OOKTOBER-Regular's own ascent/descent metrics: Canvas2D
// reports fontBoundingBoxAscent 82 / fontBoundingBoxDescent 30 at 100px,
// giving (1 + 0.82 - 0.30) / 2 = 0.76 — confirmed by directly measuring a
// rendered baseline in Chrome at 50px and 400px, both landing on 0.76
// exactly). This lets the word grow/shrink while staying pinned to the same
// baseline: `top = WORD_BASELINE_Y - fontSize * WORD_BASELINE_RATIO`.
export const WORD_BASELINE_RATIO = 0.76;
// Fixed baseline y — chosen so a word at WORD_MAX_FONT_SIZE (the common
// case, since most words hit the cap) lands exactly where the old
// ink-centered layout (WORD_CENTER_Y 836, WORD_SLOT_HEIGHT 420) used to
// place it at that size, i.e. 836 + 400 * (0.76 - 0.5).
export const WORD_BASELINE_Y = 940;

// --- Duplicated "o" animation ------------------------------------------
// Timing measured frame-by-frame from public/ref/test-1.mp4 (~30fps): the
// hold lasts 24 frames (~0.8s) before the trigger, and the deformation
// settles by frame 43 (~0.6s after the trigger).
export const HOLD_DURATION_SECONDS = 0.8;
export const SEQUENCE_DURATION_SECONDS = 1.1;
// Simplified 3-stage bounce: narrow, overshoot wide, settle. scaleY never
// changes — only scaleX animates.
export const SCALE_X_KEYFRAMES = [0.2, 2.2, 1] as const;
export const SCALE_X_TIMES = [0, 0.5, 1] as const;
// Easing.poly(n) exponent used for each segment (narrow->peak, peak->settle).
// Higher = more pronounced "very slow in/out" at that segment's slow end.
export const EASING_OUT_POWER = 6;
export const EASING_IN_POWER = 6;
// How strongly the letters *after* the duplicated "o" react during the
// overshoot peak (proportional to how far scaleX exceeds 1).
export const AFTER_REACTION_STRENGTH = 0.05;

// --- No-"o" fallback (public/ref/V3/Not Detected-NL.svg / -FR.svg) ------
// When the raw input has no "o" of its own to animate, the animated word
// becomes the fixed "oktober" / "octobre" (-> "oOktober" / "oOctobre")
// reveal instead, and the raw
// input is drawn as hollow/outline glyphs in the vertical column the old
// static "oktober" outline used to occupy (public/ref/V2/Detected.svg's
// clip1 rect: width 1880 x height 430, translate(20 1900) rotate(-90) —
// mirrored dynamically in OutlineWord.tsx). Drawn in the same pink as the
// animated word (TEXT_COLOR_NOT_DETECTED) on the white no-"o" background.
export const OUTLINE_STROKE_COLOR = "#E34C81";
export const OUTLINE_STROKE_WIDTH = 0.8;

// Not Detected-Bis.svg bakes a static "ooktober" watermark (its own
// clip2 rect, and confirmed by directly sampling the rendered background:
// solid ink from y 476 to y 710, x 21 to 1057) as a placeholder for the
// animated word in this fallback state — the animated word is repositioned
// onto that exact spot (instead of the usual WORD_MARGIN/WORD_BASELINE_Y
// slot) so it replaces the placeholder instead of doubling it up.
export const FALLBACK_ANIM_MARGIN = 21;
export const FALLBACK_ANIM_BASELINE_Y = 710;
// Safety ceiling only — fitting "oOktober" to FALLBACK_ANIM_MARGIN's width
// naturally lands close to the watermark's own size already.
export const FALLBACK_ANIM_MAX_FONT_SIZE = 320;

// --- Poster (public/ref/V3/Poster-NL.svg / Poster-FR.svg, 3000x4240) ---
// The static poster is a separate artboard from the video, with its own
// scale and margins — calibrated from the "ooser" placeholder word in
// public/ref/V3/Poster-Reference.svg (placement guide only, never
// rendered), measured by rasterizing it at 1:1 and diffing against
// Poster-NL.svg: left ink edge at x=79, right ink edge at x=2939, and the
// flat serif of its "r" sitting on the baseline at y=1413 (the "o"s
// overshoot slightly below it, as round glyphs do).
export const POSTER_CANVAS_WIDTH = 3000;
export const POSTER_CANVAS_HEIGHT = 4240;
export const POSTER_WORD_MARGIN_LEFT = 79;
export const POSTER_WORD_MARGIN_RIGHT = 3000 - 2939;
export const POSTER_WORD_BASELINE_Y = 1413;
// Same reasoning as WORD_MAX_FONT_SIZE, scaled up for the poster's own
// (much larger) coordinate space — stops very short words from growing
// absurdly large while still stretching to fill the margins otherwise.
export const POSTER_WORD_MAX_FONT_SIZE = 1600;
// The word's color on the poster (Poster-Reference.svg's own ink color) —
// the poster has a plain white background, unlike the video's two
// detection-dependent background states.
export const POSTER_TEXT_COLOR = "#D25582";
