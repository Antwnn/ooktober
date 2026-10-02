import naughtyWords from "naughty-words";

// naughty-words bundles the LDNOOBW dictionaries for ~27 languages,
// including our priority ones (fr, nl, en) plus everything else the
// dataset covers, so "any language" detection is a reasonable claim.
const ALL_WORDS: string[] = Object.values(naughtyWords).flat();

// Dictionary entries that are ordinary first names here and must not be
// blocked.
const ALLOWED_WORDS = new Set(["lolita"]);

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu;

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");

// Letters/digits only, no spaces, dashes, underscores, punctuation, etc. —
// used to catch multi-word insults typed as one run-together word (any
// separator, or none at all), e.g. "fils de pute" written "filsdepute".
const collapse = (value: string) => value.replace(NON_ALPHANUMERIC, "");

// Below this, a collapsed phrase (e.g. "s＆m" -> "sm") is too short to
// substring-match safely — it would false-positive on ordinary names/words
// ("Smith", "Jasmine", ...) once word boundaries are gone.
const MIN_COLLAPSED_PHRASE_LENGTH = 6;

const SINGLE_WORDS = new Set<string>();
const COLLAPSED_PHRASES: string[] = [];

for (const word of ALL_WORDS) {
  const normalized = normalize(word);
  if (ALLOWED_WORDS.has(normalized)) continue;
  if (normalized.includes(" ")) {
    const collapsed = collapse(normalized);
    if (collapsed.length >= MIN_COLLAPSED_PHRASE_LENGTH) {
      COLLAPSED_PHRASES.push(collapsed);
    }
  } else if (normalized.length > 0) {
    SINGLE_WORDS.add(normalized);
  }
}

export function containsProfanity(text: string): boolean {
  const normalizedText = normalize(text);
  if (normalizedText.trim().length === 0) return false;

  // Multi-word insults, matched regardless of spacing/punctuation (or the
  // lack of it) between the words.
  const collapsedText = collapse(normalizedText);
  if (COLLAPSED_PHRASES.some((phrase) => collapsedText.includes(phrase))) {
    return true;
  }

  // Single words: whole-word matching (not raw substring search) to avoid
  // false positives on innocent names that merely contain a short bad
  // word, e.g. "cummings".
  const tokens = normalizedText.split(NON_ALPHANUMERIC).filter(Boolean);
  return tokens.some((token) => SINGLE_WORDS.has(token));
}
