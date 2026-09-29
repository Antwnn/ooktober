import { loadFont as loadCustomFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { DYNAMIC_FONT_FAMILY } from "./constants";

const customFontPromise = loadCustomFont({
  family: DYNAMIC_FONT_FAMILY,
  url: staticFile("font/THINKPINKOKTOBER-Regular.otf"),
  weight: "400",
  style: "normal",
});

export const fontsReady: Promise<void> = customFontPromise.then(
  () => undefined,
);

export { DYNAMIC_FONT_FAMILY };
