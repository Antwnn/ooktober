import { Player, PlayerRef } from "@remotion/player";
import React, { useEffect, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FPS,
  POSTER_CANVAS_HEIGHT,
  POSTER_CANVAS_WIDTH,
  TOTAL_DURATION_FRAMES,
} from "../src/ooktober/constants";
import { OoktoberComposition } from "../src/ooktober/OoktoberComposition";
import { resolveOoktoberProps } from "../src/ooktober/resolveProps";
import { OoktoberResolvedProps } from "../src/ooktober/schema";
import { AnimationSettings, DEFAULT_ANIMATION_SETTINGS } from "./animationSettings";
import { Language, translations } from "./i18n";
import { PosterPreview } from "./PosterPreview";
import "./App.css";

const DEFAULT_TEXT = "Antoine";

type ShareState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; file: File }
  | { status: "error"; message: string };

type View = "video" | "poster";

export const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>("nl");
  const t = translations[language];
  const [view, setView] = useState<View>("video");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [resolved, setResolved] = useState<OoktoberResolvedProps | null>(
    null,
  );
  const settings: AnimationSettings = DEFAULT_ANIMATION_SETTINGS;
  const [renderState, setRenderState] = useState<
    { status: "idle" } | { status: "rendering" } | { status: "error"; message: string } | { status: "done"; downloadUrl: string; fileName: string; photosFile?: File }
  >({ status: "idle" });
  const [shareState, setShareState] = useState<ShareState>({ status: "idle" });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerRef = useRef<PlayerRef>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Recompute the resolved (displayText/insertIndex/fontSize) props whenever
  // the text OR the margin changes — the font-size is fit to exactly reach
  // the margins, so a margin change requires a refit too. This mirrors
  // calculateMetadata() exactly, so the Player preview and the server
  // render always agree pixel-for-pixel.
  useEffect(() => {
    let cancelled = false;
    resolveOoktoberProps({ text, margin: settings.margin, language }).then(
      (props) => {
        if (!cancelled) setResolved(props);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [text, settings.margin, language]);

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

  // Keeps the fullscreen button's icon/label in sync with the actual
  // fullscreen state, including when the user exits via Escape or the
  // browser's own UI instead of the button itself.
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      previewRef.current?.requestFullscreen();
    }
  };

  // Shared by the download and share flows: renders the current text +
  // settings server-side and returns a URL to the finished mp4.
  const renderVideoFile = async (): Promise<{ downloadUrl: string }> => {
    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, ...settings }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? `Render failed (${response.status})`);
    }
    return response.json();
  };

  // Renders the current text server-side as a print-ready poster (CMYK, A3)
  // and returns a URL to the finished PDF.
  const renderPosterFile = async (): Promise<{ downloadUrl: string }> => {
    const response = await fetch("/api/poster-render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? `Render failed (${response.status})`);
    }
    return response.json();
  };

  // Download links are one-shot: the server deletes the file as soon as it's
  // been sent. Fetch it once and keep it client-side as a blob so the retry
  // link and the share fallback don't hit the server again.
  const fetchRenderedFile = async (downloadUrl: string): Promise<Blob> => {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }
    return response.blob();
  };

  const saveBlob = (objectUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.click();
  };

  // Release the previous render's in-memory file when it's replaced.
  useEffect(() => {
    if (renderState.status !== "done") return;
    const { downloadUrl } = renderState;
    return () => URL.revokeObjectURL(downloadUrl);
  }, [renderState]);

  // On phones a plain download lands in Files, not the photo library. A
  // website can only reach the library through the OS share sheet ("Save
  // Video"), so video downloads on touch devices go through it instead.
  // No title/text: iOS drops "Save Video" when the share carries text.
  const saveToPhotos = (file: File) =>
    navigator.share({ files: [file] }).catch(() => {
      // Closed, or the render outlasted the tap's user-gesture window —
      // the "Save to Photos" button under the download button retries it.
    });

  const handleDownload = async () => {
    setRenderState({ status: "rendering" });
    try {
      const { downloadUrl } =
        view === "poster" ? await renderPosterFile() : await renderVideoFile();
      const blob = await fetchRenderedFile(downloadUrl);
      const objectUrl = URL.createObjectURL(blob);
      const fileName = view === "poster" ? "ooktober-poster.pdf" : "ooktober.mp4";
      const videoFile =
        view === "video"
          ? new File([blob], fileName, { type: "video/mp4" })
          : null;
      if (
        videoFile &&
        window.matchMedia("(pointer: coarse)").matches &&
        canWebShareFile(videoFile)
      ) {
        setRenderState({
          status: "done",
          downloadUrl: objectUrl,
          fileName,
          photosFile: videoFile,
        });
        await saveToPhotos(videoFile);
        return;
      }
      setRenderState({ status: "done", downloadUrl: objectUrl, fileName });
      saveBlob(objectUrl, fileName);
    } catch (err) {
      setRenderState({
        status: "error",
        message: err instanceof Error ? err.message : t.unknownError,
      });
    }
  };

  const canWebShareFile = (file: File) =>
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  // Hands the rendered video to the OS share sheet. On mobile, picking
  // Instagram from that sheet opens Instagram directly on its Stories
  // composer with the video already attached — that's the only path a
  // website can trigger reliably, since Instagram has no public API for a
  // third-party site to preload a story directly.
  const shareFile = async (file: File) => {
    try {
      await navigator.share({
        files: [file],
        title: t.shareSheetTitle,
        text: t.shareSheetText,
      });
      setShareState({ status: "idle" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User closed the share sheet without picking anything.
        setShareState({ status: "idle" });
        return;
      }
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError")
      ) {
        // The render/fetch delay can outlast the browser's "recent user
        // gesture" window (notably on iOS Safari). Keep the file ready so
        // a direct tap on the button retries the share immediately.
        setShareState((prev) =>
          prev.status === "ready" ? prev : { status: "ready", file },
        );
        return;
      }
      setShareState({
        status: "error",
        message: err instanceof Error ? err.message : t.shareFailed,
      });
    }
  };

  const handleShareClick = async () => {
    if (shareState.status === "ready") {
      await shareFile(shareState.file);
      return;
    }

    setShareState({ status: "preparing" });
    try {
      const { downloadUrl } = await renderVideoFile();
      const blob = await fetchRenderedFile(downloadUrl);
      const file = new File([blob], "ooktober.mp4", { type: "video/mp4" });

      if (canWebShareFile(file)) {
        await shareFile(file);
      } else {
        // No native share sheet available (most desktop browsers): there is
        // no public Instagram API to preload a story from a website, so we
        // download the video for the user and open Instagram for them to
        // add it to their story themselves.
        const objectUrl = URL.createObjectURL(blob);
        saveBlob(objectUrl, file.name);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
        setShareState({ status: "idle" });
      }
    } catch (err) {
      setShareState({
        status: "error",
        message: err instanceof Error ? err.message : t.shareFailed,
      });
    }
  };

  const playerProps: OoktoberResolvedProps | null = resolved
    ? { ...resolved, ...settings }
    : null;

  return (
    <div className="page">
      <div className="view-switch">
        <button
          type="button"
          className={view === "video" ? "active" : ""}
          onClick={() => setView("video")}
        >
          {t.viewVideo}
        </button>
        <button
          type="button"
          className={view === "poster" ? "active" : ""}
          onClick={() => setView("poster")}
        >
          {t.viewPoster}
        </button>
      </div>

      <div className="language-switch">
        <button
          type="button"
          className={language === "nl" ? "active" : ""}
          onClick={() => setLanguage("nl")}
        >
          NL
        </button>
        <button
          type="button"
          className={language === "fr" ? "active" : ""}
          onClick={() => setLanguage("fr")}
        >
          FR
        </button>
      </div>

      <div className="panel-intro">
        <img
          className="logo-image"
          src={language === "fr" ? "/ref/V3/Logo-FR.svg" : "/ref/V3/Logo-NL.svg"}
          alt={language === "fr" ? "ooctobre" : "ooktober"}
        />
        <p className="subtitle">
          {view === "poster" ? t.subtitlePoster : t.subtitle}
        </p>
      </div>

      <div className="preview">
        <div
          ref={previewRef}
          className={`phone${isFullscreen ? " phone--fullscreen" : ""}`}
          style={{
            aspectRatio:
              view === "video"
                ? `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`
                : `${POSTER_CANVAS_WIDTH} / ${POSTER_CANVAS_HEIGHT}`,
          }}
        >
          {view === "video" && playerProps && (
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
              clickToPlay={false}
            />
          )}
          {view === "poster" && (
            <>
              <PosterPreview text={text} language={language} />
              <button
                type="button"
                className="fullscreen-button"
                onClick={toggleFullscreen}
                aria-label={
                  isFullscreen ? t.fullscreenExit : t.fullscreenEnter
                }
                title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
              >
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                      d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel-form">
        <div className="fields-grid">
          <label className="field">
            <span className="field-label">
              {view === "poster" ? t.fieldLabelPoster : t.fieldLabelVideo}
            </span>
            <span className="field-box">
              <input
                type="text"
                value={text}
                maxLength={40}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.fieldPlaceholder}
              />
            </span>
          </label>

          {view === "video" && (
            <button
              type="button"
              className="share-button"
              onClick={handleShareClick}
              disabled={
                shareState.status === "preparing" || text.trim().length === 0
              }
            >
              {shareState.status === "preparing"
                ? t.sharePreparing
                : shareState.status === "ready"
                  ? t.shareReady
                  : t.shareIdle}
            </button>
          )}

          <button
            type="button"
            className="download-button"
            onClick={handleDownload}
            disabled={
              renderState.status === "rendering" || text.trim().length === 0
            }
          >
            {renderState.status === "rendering"
              ? view === "poster"
                ? t.posterDownloadRendering
                : t.downloadRendering
              : t.downloadIdle}
          </button>

          <a
            className="donate-button"
            href="https://www.think-pink.be/en/donate/introduction"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.donate}
          </a>
        </div>

        {resolved?.isBlocked && (
          <p className="warning">{t.warningBlocked}</p>
        )}
        {view === "video" && shareState.status === "error" && (
          <p className="error">{shareState.message}</p>
        )}
        {renderState.status === "error" && (
          <p className="error">{renderState.message}</p>
        )}
        {renderState.status === "done" &&
          (renderState.photosFile ? (
            <div className="success">
              <button
                type="button"
                className="save-photos-button"
                onClick={() => {
                  if (renderState.photosFile) saveToPhotos(renderState.photosFile);
                }}
              >
                {t.saveToPhotos}
              </button>
              <p className="save-photos-hint">{t.saveToPhotosHint}</p>
            </div>
          ) : (
            <p className="success">
              {t.successDone}{" "}
              <a href={renderState.downloadUrl} download={renderState.fileName}>
                {t.successRetryLink}
              </a>
            </p>
          ))}
      </div>
    </div>
  );
};
