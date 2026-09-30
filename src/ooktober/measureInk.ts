export type InkMeasurement = {
  // The CSS *advance* width — what a `width`/`letter-spacing`-based layout
  // box would use. This is what @remotion/layout-utils' measureText/fitText
  // report too.
  advanceWidth: number;
  // How far the *painted* glyph ink extends past the advance box on each
  // side (0 if it doesn't). OOKTOBER-Regular paints outside its advance box
  // — e.g. the trailing "e" overshoots past its own advance width — so
  // fitting text tightly to a margin needs this, not the advance width
  // alone.
  overshootLeft: number;
  overshootRight: number;
  inkWidth: number;
};

// Canvas2D's `letterSpacing` isn't implemented in every browser (notably
// older Safari/iOS), where setting it is silently ignored and the text
// measures as if it had no spacing at all — making the fitted word too big
// for its margins in the preview. When it's missing, the spacing is added
// by hand: CSS letter-spacing adds one gap after every character, so the
// advance grows by one gap per character and the ink's right edge by one
// gap per character but the last.
function measureSpacedText(
  text: string,
  fontFamily: string,
  fontSize: number,
  letterSpacingEm: number,
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.font = `${fontSize}px "${fontFamily}"`;
  const spacing = fontSize * letterSpacingEm;
  const supportsLetterSpacing = "letterSpacing" in ctx;
  if (supportsLetterSpacing) {
    ctx.letterSpacing = `${spacing}px`;
  }
  const metrics = ctx.measureText(text);
  const charCount = Array.from(text).length;
  const manualSpacing = supportsLetterSpacing ? 0 : spacing;
  return {
    width: metrics.width + manualSpacing * charCount,
    actualBoundingBoxLeft: metrics.actualBoundingBoxLeft,
    actualBoundingBoxRight:
      metrics.actualBoundingBoxRight + manualSpacing * Math.max(0, charCount - 1),
  };
}

// Canvas2D's TextMetrics reports both the advance box (`width`) and the
// actual painted ink extent (`actualBoundingBox*`), unlike
// @remotion/layout-utils which only reports the advance box.
export function measureInk(
  text: string,
  fontFamily: string,
  fontSize: number,
  letterSpacingEm: number,
): InkMeasurement {
  const metrics = measureSpacedText(text, fontFamily, fontSize, letterSpacingEm);
  // Per the Canvas2D spec, actualBoundingBoxLeft is the distance *going
  // left* from the alignment point (the advance box's left edge, for
  // default left/start alignment) — positive means the ink starts to the
  // left of that edge, i.e. overshoots it.
  const overshootLeft = Math.max(0, metrics.actualBoundingBoxLeft);
  const overshootRight = Math.max(0, metrics.actualBoundingBoxRight - metrics.width);
  return {
    advanceWidth: metrics.width,
    overshootLeft,
    overshootRight,
    inkWidth: overshootLeft + metrics.width + overshootRight,
  };
}

export type SplitWordInk = InkMeasurement & {
  // The duplicated "O"'s own advance width (measured with its own,
  // possibly tighter, letter-spacing) — callers need this on its own to
  // size the animated "O"'s box independently of `before`/`after`.
  oWidth: number;
};

// Measures a word split around its duplicated "O", letting the gap right
// after that "O" use a different letter-spacing than the rest of the word
// (see WORD_LETTER_SPACING_AFTER_O_EM) — used by both resolveProps.ts's
// font-size fitting and AnimatedWord's positioning, so they never drift
// apart. Letter-spacing is additive per character, so the three pieces'
// metrics compose exactly into the same total the whole word would measure
// as if it were spaced uniformly throughout.
export function measureSplitWordInk(
  before: string,
  after: string,
  fontFamily: string,
  fontSize: number,
  letterSpacingEm: number,
  afterOLetterSpacingEm: number,
): SplitWordInk {
  const beforeInk = measureInk(before, fontFamily, fontSize, letterSpacingEm);
  const oInk = measureInk("O", fontFamily, fontSize, afterOLetterSpacingEm);
  const afterInk = measureInk(after, fontFamily, fontSize, letterSpacingEm);
  const advanceWidth = beforeInk.advanceWidth + oInk.advanceWidth + afterInk.advanceWidth;
  return {
    advanceWidth,
    overshootLeft: beforeInk.overshootLeft,
    overshootRight: afterInk.overshootRight,
    inkWidth: beforeInk.overshootLeft + advanceWidth + afterInk.overshootRight,
    oWidth: oInk.advanceWidth,
  };
}
