import { CalculateMetadataFunction } from "remotion";
import { CANVAS_HEIGHT, CANVAS_WIDTH, FPS, TOTAL_DURATION_FRAMES } from "./constants";
import { resolveOoktoberProps } from "./resolveProps";
import { OoktoberInputProps, OoktoberResolvedProps } from "./schema";

export const calculateOoktoberMetadata: CalculateMetadataFunction<
  OoktoberResolvedProps & OoktoberInputProps
> = async ({ props }) => {
  const resolvedProps = await resolveOoktoberProps(props);

  return {
    durationInFrames: TOTAL_DURATION_FRAMES,
    fps: FPS,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    props: resolvedProps,
  };
};
