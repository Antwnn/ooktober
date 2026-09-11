import React from "react";
import {
  BOTTOM_PARAGRAPH_CENTER_Y,
  BOTTOM_PARAGRAPH_FONT_SIZE,
  BOTTOM_PARAGRAPH_FONT_WEIGHT,
  BOTTOM_PARAGRAPH_LEFT,
  BOTTOM_PARAGRAPH_LINE_HEIGHT,
  BOTTOM_PARAGRAPH_LINES,
  BOTTOM_PARAGRAPH_SLOT_HEIGHT,
  CAPTION_FONT_FAMILY,
  CANVAS_WIDTH,
  TEXT_COLOR,
  TOP_CAPTION_CENTER_Y,
  TOP_CAPTION_FONT_SIZE,
  TOP_CAPTION_FONT_WEIGHT,
  TOP_CAPTION_LEFT,
  TOP_CAPTION_SLOT_HEIGHT,
  TOP_CAPTION_TEXT,
} from "./constants";

// These two captions are never animated and never editable by the tool's
// user: text, font, size, color and position are copied exactly from
// public/ref/Fond.svg and must stay identical regardless of the dynamic word.
export const StaticCaptions: React.FC = () => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: TOP_CAPTION_LEFT,
          width: CANVAS_WIDTH - TOP_CAPTION_LEFT,
          top: TOP_CAPTION_CENTER_Y - TOP_CAPTION_SLOT_HEIGHT / 2,
          height: TOP_CAPTION_SLOT_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <span
          style={{
            fontFamily: CAPTION_FONT_FAMILY,
            fontWeight: TOP_CAPTION_FONT_WEIGHT,
            fontSize: TOP_CAPTION_FONT_SIZE,
            color: TEXT_COLOR,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {TOP_CAPTION_TEXT}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: BOTTOM_PARAGRAPH_LEFT,
          width: CANVAS_WIDTH - BOTTOM_PARAGRAPH_LEFT,
          top: BOTTOM_PARAGRAPH_CENTER_Y - BOTTOM_PARAGRAPH_SLOT_HEIGHT / 2,
          height: BOTTOM_PARAGRAPH_SLOT_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {BOTTOM_PARAGRAPH_LINES.map((line, index) => (
          <span
            key={index}
            style={{
              fontFamily: CAPTION_FONT_FAMILY,
              fontWeight: BOTTOM_PARAGRAPH_FONT_WEIGHT,
              fontSize: BOTTOM_PARAGRAPH_FONT_SIZE,
              color: TEXT_COLOR,
              lineHeight: BOTTOM_PARAGRAPH_LINE_HEIGHT,
              whiteSpace: "nowrap",
            }}
          >
            {line}
          </span>
        ))}
      </div>
    </>
  );
};
