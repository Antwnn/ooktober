import { Composition } from "remotion";
import { Main } from "./Main";

import { calculateMetadata } from "./calculate-metadata/calculate-metadata";
import { schema } from "./calculate-metadata/schema";
import { calculateOoktoberMetadata } from "./ooktober/calculateMetadata";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FPS,
  TOTAL_DURATION_FRAMES,
} from "./ooktober/constants";
import { OoktoberComposition } from "./ooktober/OoktoberComposition";
import { ooktoberSchema } from "./ooktober/schema";

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
        }}
        fps={FPS}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        durationInFrames={TOTAL_DURATION_FRAMES}
        calculateMetadata={calculateOoktoberMetadata}
        schema={ooktoberSchema}
      />
    </>
  );
};
