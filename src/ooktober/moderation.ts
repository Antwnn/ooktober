import naughtyWords from "naughty-words";

// naughty-words bundles the LDNOOBW dictionaries for ~27 languages,
// including our priority ones (fr, nl, en) plus everything else the
// dataset covers, so "any language" detection is a reasonable claim.
const ALL_WORDS: string[] = Object.values(naughtyWords).flat();

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");

const SINGLE_WORDS = new Set<string>();
const PHRASES: string[] = [];

for (const word of ALL_WORDS) {
  const normalized = normalize(word);
  if (normalized.includes(" ")) {
    PHRASES.push(normalized);
  } else if (normalized.length > 0) {
    SINGLE_WORDS.add(normalized);
  }
}

// Whole-word matching (not raw substring search) to avoid false positives
// on innocent names that merely contain a short bad word, e.g. "cummings".
export function containsProfanity(text: string): boolean {
  const normalizedText = normalize(text);
  if (normalizedText.trim().length === 0) return false;

  if (PHRASES.some((phrase) => normalizedText.includes(phrase))) {
    return true;
  }

  const tokens = normalizedText.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.some((token) => SINGLE_WORDS.has(token));
}
