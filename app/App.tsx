import { Player, PlayerRef } from "@remotion/player";
import React, { useEffect, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FPS,
  TOTAL_DURATION_FRAMES,
} from "../src/ooktober/constants";
import { OoktoberComposition } from "../src/ooktober/OoktoberComposition";
import { resolveOoktoberProps } from "../src/ooktober/resolveProps";
import { OoktoberResolvedProps } from "../src/ooktober/schema";
import { AnimationSettingsPanel } from "./AnimationSettingsPanel";
import { AnimationSettings, DEFAULT_ANIMATION_SETTINGS } from "./animationSettings";
import "./App.css";

const DEFAULT_TEXT = "Antoine";

export const App: React.FC = () => {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [resolved, setResolved] = useState<OoktoberResolvedProps | null>(
    null,
  );
  const [settings, setSettings] = useState<AnimationSettings>(
    DEFAULT_ANIMATION_SETTINGS,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [renderState, setRenderState] = useState<
    { status: "idle" } | { status: "rendering" } | { status: "error"; message: string } | { status: "done"; downloadUrl: string }
  >({ status: "idle" });

  const playerRef = useRef<PlayerRef>(null);

  // Recompute the resolved (displayText/insertIndex/fontSize) props whenever
  // the text OR the margin changes — the font-size is fit to exactly reach
  // the margins, so a margin change requires a refit too. This mirrors
  // calculateMetadata() exactly, so the Player preview and the server
  // render always agree pixel-for-pixel.
  useEffect(() => {
    let cancelled = false;
    resolveOoktoberProps({ text, margin: settings.margin }).then((props) => {
      if (!cancelled) setResolved(props);
    });
    return () => {
      cancelled = true;
    };
  }, [text, settings.margin]);

  // Changing the text or an animation setting resets the preview and
  // restarts playback from frame 0.
  useEffect(() => {
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, [
    resolved?.displayText,
    resolved?.fontSize,
    settings.margin,
    settings.stretchPeak,
    settings.sequenceDurationSeconds,
    settings.easingOutPower,
    settings.easingInPower,
  ]);

  const handleDownload = async () => {
    setRenderState({ status: "rendering" });
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...settings }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Render failed (${response.status})`);
      }
      const { downloadUrl } = await response.json();
      setRenderState({ status: "done", downloadUrl });
      window.location.href = downloadUrl;
    } catch (err) {
      setRenderState({
        status: "error",
        message: err instanceof Error ? err.message : "Onbekende fout",
      });
    }
  };

  const playerProps: OoktoberResolvedProps | null = resolved
    ? { ...resolved, ...settings }
    : null;

  return (
    <div className="page">
      <div className="panel">
        <h1>Personaliseer je Oktober-video</h1>
        <p className="subtitle">
          Typ een naam of woord. Bevat het een "o"? Dan verdubbelt hij
          automatisch, net als in de campagne.
        </p>

        <label className="field">
          <span>Jouw tekst</span>
          <input
            type="text"
            value={text}
            maxLength={40}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bijv. Antoine"
          />
        </label>

        {resolved?.isBlocked && (
          <p className="warning">
            Ongepaste tekst gedetecteerd — alle tekst is verborgen in de
            video zolang dit woord er staat.
          </p>
        )}

        <button
          className="download-button"
          onClick={handleDownload}
          disabled={
            renderState.status === "rendering" || text.trim().length === 0
          }
        >
          {renderState.status === "rendering"
            ? "Video wordt gerenderd…"
            : "Download video"}
        </button>

        <button
          type="button"
          className="settings-toggle"
          onClick={() => setShowSettings((v) => !v)}
        >
          {showSettings ? "Réglages animation ▲" : "Réglages animation ▼"}
        </button>

        {renderState.status === "error" && (
          <p className="error">{renderState.message}</p>
        )}
        {renderState.status === "done" && (
          <p className="success">
            Klaar!{" "}
            <a href={renderState.downloadUrl}>Download opnieuw</a>
          </p>
        )}

        {showSettings && (
          <AnimationSettingsPanel
            settings={settings}
            defaults={DEFAULT_ANIMATION_SETTINGS}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>

      <div className="preview">
        <div
          className="phone"
          style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
        >
          {playerProps && (
            <Player
              ref={playerRef}
              component={OoktoberComposition}
              inputProps={playerProps}
              durationInFrames={TOTAL_DURATION_FRAMES}
              compositionWidth={CANVAS_WIDTH}
              compositionHeight={CANVAS_HEIGHT}
              fps={FPS}
              style={{ width: "100%", height: "100%" }}
              loop
              autoPlay
              controls
              alwaysShowControls
              clickToPlay={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};
