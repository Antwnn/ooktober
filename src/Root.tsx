import { Composition } from "remotion";
import { Main } from "./Main";

import { calculateMetadata } from "./calculate-metadata/calculate-metadata";
import { schema } from "./calculate-metadata/schema";
import { calculateOoktoberMetadata } from "./ooktober/calculateMetadata";
import { calculatePosterMetadata } from "./ooktober/calculatePosterMetadata";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FPS,
  POSTER_CANVAS_HEIGHT,
  POSTER_CANVAS_WIDTH,
  TOTAL_DURATION_FRAMES,
} from "./ooktober/constants";
import { OoktoberComposition } from "./ooktober/OoktoberComposition";
import { PosterComposition } from "./ooktober/PosterComposition";
import { ooktoberSchema, posterSchema } from "./ooktober/schema";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        defaultProps={{
          steps: null,
          themeColors: null,
          theme: "github-dark" as const,
          codeWidth: null,
          width: {
            type: "auto",
          },
        }}
        fps={30}
        height={1080}
        calculateMetadata={calculateMetadata}
        schema={schema}
      />
      <Composition
        id="OoktoberWord"
        component={OoktoberComposition}
        defaultProps={{
          text: "Antoine",
          displayText: "Antooine",
          insertIndex: 4,
          hasAnimation: true,
          fontSize: 200,
          isBlocked: false,
          noODetected: false,
          outlineFontSize: 0,
          wordMargin: 40,
        }}
        fps={FPS}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        durationInFrames={TOTAL_DURATION_FRAMES}
        calculateMetadata={calculateOoktoberMetadata}
        schema={ooktoberSchema}
      />
      <Composition
        id="OoktoberPoster"
        component={PosterComposition}
        defaultProps={{
          text: "Antoine",
          displayText: "antOoine",
          hasAnimation: true,
          fontSize: 800,
          isBlocked: false,
        }}
        fps={1}
        width={POSTER_CANVAS_WIDTH}
        height={POSTER_CANVAS_HEIGHT}
        durationInFrames={1}
        calculateMetadata={calculatePosterMetadata}
        schema={posterSchema}
      />
    </>
  );
};
