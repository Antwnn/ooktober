export type AnimatedTextResult = {
  hasAnimation: boolean;
  displayText: string;
  insertIndex: number | null;
};

export function getAnimatedText(text: string): AnimatedTextResult {
  // The render never uses caps, regardless of how the user typed the input.
  const lowerText = text.toLowerCase();

  // If the word already has two "o"s side by side, don't duplicate one —
  // the reveal only makes sense when there isn't already a visible double.
  if (lowerText.includes("oo")) {
    return { hasAnimation: false, displayText: lowerText, insertIndex: null };
  }

  const index = lowerText.indexOf("o");
  if (index === -1) {
    return { hasAnimation: false, displayText: lowerText, insertIndex: null };
  }
  const before = lowerText.slice(0, index + 1);
  const after = lowerText.slice(index + 1);
  const displayText = before + "o" + after;
  return { hasAnimation: true, displayText, insertIndex: index + 1 };
}
