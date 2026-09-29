import { CalculateMetadataFunction } from "remotion";
import { POSTER_CANVAS_HEIGHT, POSTER_CANVAS_WIDTH } from "./constants";
import { resolvePosterWord } from "./resolvePosterWord";
import { PosterInputProps, PosterResolvedProps } from "./schema";

export const calculatePosterMetadata: CalculateMetadataFunction<
  PosterResolvedProps & PosterInputProps
> = async ({ props }) => {
  const resolvedProps = await resolvePosterWord(props);

  return {
    durationInFrames: 1,
    fps: 1,
    width: POSTER_CANVAS_WIDTH,
    height: POSTER_CANVAS_HEIGHT,
    props: resolvedProps,
  };
};
