export type AnimatedTextResult = {
  hasAnimation: boolean;
  displayText: string;
  insertIndex: number | null;
};

export function getAnimatedText(text: string): AnimatedTextResult {
  // The render never uses caps, regardless of how the user typed the input.
  const lowerText = text.toLowerCase();

  // A word that already has two "o"s side by side (e.g. "toon") reveals the
  // *second* one of that pair via the same effect, instead of adding a
  // third — the collapsed state is the word with that "o" removed ("ton"),
  // which then expands back into the original word ("toon").
  const doubleIndex = lowerText.indexOf("oo");
  if (doubleIndex !== -1) {
    const insertIndex = doubleIndex + 1;
    const displayText =
      lowerText.slice(0, insertIndex) + "O" + lowerText.slice(insertIndex + 1);
    return { hasAnimation: true, displayText, insertIndex };
  }

  const index = lowerText.indexOf("o");
  if (index === -1) {
    return { hasAnimation: false, displayText: lowerText, insertIndex: null };
  }
  // The duplicated letter is always a capital "O", regardless of the case
  // of the rest of the (lowercased) word — this must match what
  // AnimatedWord actually renders at insertIndex, since this string is
  // also what gets measured/fit to the margins.
  const before = lowerText.slice(0, index + 1);
  const after = lowerText.slice(index + 1);
  const displayText = before + "O" + after;
  return { hasAnimation: true, displayText, insertIndex: index + 1 };
}
