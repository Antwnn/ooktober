// Calibrated from public/ref/Fond.svg (1080x1920 artboard) and public/font/PPEditorialOld-Regular 1.otf.

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;
export const FPS = 30;
export const TOTAL_DURATION_SECONDS = 4;
export const TOTAL_DURATION_FRAMES = Math.round(TOTAL_DURATION_SECONDS * FPS);

export const BACKGROUND_COLOR = "#E34C81";
export const TEXT_COLOR = "#F3ACC1";

// The dynamic word uses the local display font shipped in public/font.
export const DYNAMIC_FONT_FAMILY = "PP Editorial Old";
// No font file was provided for the two static captions. Poppins Bold is a
// close visual match to the geometric grotesk used in Fond.svg and is loaded
// via @remotion/google-fonts.
export const CAPTION_FONT_FAMILY = "Poppins";

// --- Dynamic word -----------------------------------------------------
// Default margin, adjustable at runtime via the web tool's settings panel
// (passed through as the "margin" prop). The word's font-size is always
// fit so it touches both margins exactly once settled.
export const WORD_MARGIN = 50;
// @remotion/layout-utils' fitText()/measureText() report the CSS *advance*
// box of the text, not its painted ink extent. PP Editorial Old has
// decorative swashes (e.g. the trailing "e") whose ink paints outside that
// advance box, so the fit target is shrunk slightly to keep the visible
// glyphs (not just their advance box) inside the margins. Calibrated
// against a render of the reference word "Roomaine".
export const WORD_INK_SAFETY = 0.978;
export const getWordMaxWidth = (margin: number) =>
  (CANVAS_WIDTH - margin * 2) * WORD_INK_SAFETY;
export const WORD_LETTER_SPACING = "-0.07em";
export const WORD_LETTER_SPACING_EM = -0.07;
// Vertical center of the "Roomaine" ink bounding box in Fond.svg (719.0 - 952.6).
export const WORD_CENTER_Y = 836;
export const WORD_SLOT_HEIGHT = 420;

// --- Static top caption -------------------------------------------------
export const TOP_CAPTION_TEXT = "Deze maand ben ik";
export const TOP_CAPTION_LEFT = 197;
export const TOP_CAPTION_FONT_SIZE = 40;
export const TOP_CAPTION_FONT_WEIGHT = 700;
// Vertical center of its ink bounding box in Fond.svg (502.0 - 535.5).
export const TOP_CAPTION_CENTER_Y = 519;
export const TOP_CAPTION_SLOT_HEIGHT = 80;

// --- Static bottom paragraph ---------------------------------------------
export const BOTTOM_PARAGRAPH_LINES = [
  "Want in oktober verdubbelen",
  "wij mee de aandacht voor",
  "boorstkanker.",
];
export const BOTTOM_PARAGRAPH_LEFT = 197;
export const BOTTOM_PARAGRAPH_FONT_SIZE = 40;
export const BOTTOM_PARAGRAPH_FONT_WEIGHT = 700;
export const BOTTOM_PARAGRAPH_LINE_HEIGHT = 1.2;
// Vertical center of its ink bounding box in Fond.svg (1214.0 - 1341.6).
export const BOTTOM_PARAGRAPH_CENTER_Y = 1278;
export const BOTTOM_PARAGRAPH_SLOT_HEIGHT = 220;

// --- Duplicated "o" animation ------------------------------------------
// Timing measured frame-by-frame from public/ref/test-1.mp4 (~30fps): the
// hold lasts 24 frames (~0.8s) before the trigger, and the deformation
// settles by frame 43 (~0.6s after the trigger).
export const HOLD_DURATION_SECONDS = 0.8;
export const SEQUENCE_DURATION_SECONDS = 0.6;
// Simplified 3-stage bounce: narrow, overshoot wide, settle. scaleY never
// changes — only scaleX animates.
export const SCALE_X_KEYFRAMES = [0.2, 1.6, 1] as const;
export const SCALE_X_TIMES = [0, 0.5, 1] as const;
// Easing.poly(n) exponent used for each segment (narrow->peak, peak->settle).
// Higher = more pronounced "very slow in/out" at that segment's slow end.
export const EASING_OUT_POWER = 4;
export const EASING_IN_POWER = 4;
// How strongly the letters *after* the duplicated "o" react during the
// overshoot peak (proportional to how far scaleX exceeds 1).
export const AFTER_REACTION_STRENGTH = 0.05;
