import { loadFont as loadCustomFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { DYNAMIC_FONT_FAMILY } from "./constants";

// Also parsed directly for the outline word's glyph paths (outlinePath.ts).
export const DYNAMIC_FONT_FILE = "font/THINKPINKOKTOBER-Regular.otf";

const customFontPromise = loadCustomFont({
  family: DYNAMIC_FONT_FAMILY,
  url: staticFile(DYNAMIC_FONT_FILE),
  weight: "400",
  style: "normal",
});

export const fontsReady: Promise<void> = customFontPromise.then(
  () => undefined,
);

export { DYNAMIC_FONT_FAMILY };
