import { loadFont as loadCustomFont } from "@remotion/fonts";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { staticFile } from "remotion";
import { CAPTION_FONT_FAMILY, DYNAMIC_FONT_FAMILY } from "./constants";

const customFontPromise = loadCustomFont({
  family: DYNAMIC_FONT_FAMILY,
  url: staticFile("font/PPEditorialOld-Regular 1.otf"),
  weight: "400",
  style: "normal",
});

const { waitUntilDone: waitForPoppins } = loadPoppins("normal", {
  subsets: ["latin"],
  weights: ["700"],
});

export const fontsReady: Promise<void> = Promise.all([
  customFontPromise,
  waitForPoppins(),
]).then(() => undefined);

export { CAPTION_FONT_FAMILY, DYNAMIC_FONT_FAMILY };
