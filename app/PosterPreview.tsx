import React, { useEffect, useState } from "react";
import { PosterComposition } from "../src/ooktober/PosterComposition";
import { resolvePosterWord } from "../src/ooktober/resolvePosterWord";
import { Language, PosterResolvedProps } from "../src/ooktober/schema";

type Props = { text: string; language: Language };

// Resolves the fitted fontSize/displayText for the current input (same
// margin-to-margin ink fitting the server render uses, see
// resolvePosterWord.ts) and hands it to the same presentational component
// the PDF download renders server-side, so the two always match.
export const PosterPreview: React.FC<Props> = ({ text, language }) => {
  const [resolved, setResolved] = useState<PosterResolvedProps | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolvePosterWord({ text, language }).then((r) => {
      if (!cancelled) setResolved(r);
    });
    return () => {
      cancelled = true;
    };
  }, [text, language]);

  if (!resolved) return null;
  return <PosterComposition {...resolved} />;
};
