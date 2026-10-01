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
    { status: "idle" } | { status: "rendering" } | { status: "error"; message: string } | { status: "done"; downloadUrl: string; fileName: string } | { status: "tapAgain" } | { status: "saved" }
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
  const renderVideoFile = async (
    videoText: string,
    videoLanguage: Language,
  ): Promise<{ downloadUrl: string }> => {
    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: videoText, language: videoLanguage, ...settings }),
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

  // The rendered mp4 for a given text + language, kept client-side so it's
  // only rendered once however many times it's downloaded or shared.
  const videoCacheRef = useRef<{
    key: string;
    promise: Promise<File>;
    file: File | null;
  } | null>(null);
  const videoKey = JSON.stringify([text, language]);

  const prepareVideo = (): Promise<File> => {
    const cached = videoCacheRef.current;
    if (cached?.key === videoKey) return cached.promise;
    const entry = {
      key: videoKey,
      file: null as File | null,
      promise: renderVideoFile(text, language)
        .then(({ downloadUrl }) => fetchRenderedFile(downloadUrl))
        .then((blob) => {
          const file = new File([blob], "ooktober.mp4", { type: "video/mp4" });
          entry.file = file;
          return file;
        }),
    };
    entry.promise.catch(() => {
      // Let the next attempt re-render instead of reusing the failure.
      if (videoCacheRef.current === entry) videoCacheRef.current = null;
    });
    videoCacheRef.current = entry;
    return entry.promise;
  };

  // On phones a plain download lands in Files, not the photo library. A
  // website can only reach the library through the OS share sheet ("Save
  // Video"), and only right after a tap — far shorter than a render. So on
  // touch devices the video is rendered ahead of time, once the user stops
  // typing, and the Download tap opens the share sheet immediately.
  const isTouchDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches &&
    typeof navigator.share === "function";

  useEffect(() => {
    if (!isTouchDevice || view !== "video" || text.trim().length === 0) return;
    const timer = setTimeout(() => {
      prepareVideo().catch(() => {
        // Surfaced if the user taps Download; nothing to show before that.
      });
    }, 1200);
    return () => clearTimeout(timer);
    // prepareVideo only depends on text/language, both covered by videoKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouchDevice, view, videoKey]);

  // No title/text: iOS drops "Save Video" when the share carries text.
  const saveToPhotos = async (file: File) => {
    try {
      await navigator.share({ files: [file] });
      // Resolves once an action was picked in the share sheet (it rejects
      // if the sheet is dismissed). Confirm it: without this, nothing on the
      // page shows the video was saved and people download it again.
      setRenderState({ status: "saved" });
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError")
      ) {
        // The tap came before the video was ready and the render outlasted
        // its user-gesture window. The file is cached now, so the next tap
        // on Download opens the share sheet instantly.
        setRenderState({ status: "tapAgain" });
        return;
      }
      setRenderState({ status: "idle" });
    }
  };

  const handleDownload = async () => {
    if (view === "video" && isTouchDevice) {
      const cached = videoCacheRef.current;
      if (cached?.key === videoKey && cached.file && canWebShareFile(cached.file)) {
        // Already rendered: share synchronously, inside the tap's gesture.
        saveToPhotos(cached.file);
        return;
      }
    }

    setRenderState({ status: "rendering" });
    try {
      if (view === "video") {
        const file = await prepareVideo();
        if (isTouchDevice && canWebShareFile(file)) {
          await saveToPhotos(file);
          return;
        }
        const objectUrl = URL.createObjectURL(file);
        setRenderState({ status: "done", downloadUrl: objectUrl, fileName: file.name });
        saveBlob(objectUrl, file.name);
        return;
      }
      // The poster PDF is always a regular file download (Files on phones).
      const { downloadUrl } = await renderPosterFile();
      const blob = await fetchRenderedFile(downloadUrl);
      const objectUrl = URL.createObjectURL(blob);
      const fileName = "ooktober-poster.pdf";
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

    const cached = videoCacheRef.current;
    if (cached?.key === videoKey && cached.file && canWebShareFile(cached.file)) {
      // Already rendered: share synchronously, inside the tap's gesture.
      await shareFile(cached.file);
      return;
    }

    setShareState({ status: "preparing" });
    try {
      const file = await prepareVideo();

      if (canWebShareFile(file)) {
        await shareFile(file);
      } else {
        // No native share sheet available (most desktop browsers): there is
        // no public Instagram API to preload a story from a website, so we
        // download the video for the user and open Instagram for them to
        // add it to their story themselves.
        const objectUrl = URL.createObjectURL(file);
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
              // The composition has no sound. Unmuted, the Player waits for
              // its AudioContext to resume before advancing frames, which
              // browsers only allow after a user gesture — so on a fresh
              // page load the preview stayed frozen until the first tap or
              // keystroke.
              initiallyMuted
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
            href={t.donateUrl}
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
        {renderState.status === "saved" && (
          <div
            className="saved-overlay"
            onClick={() => setRenderState({ status: "idle" })}
          >
            <div
              className="saved-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="saved-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="saved-check" aria-hidden="true">✓</div>
              <h2 id="saved-title">{t.savedTitle}</h2>
              <p>{t.savedText}</p>
              <button
                type="button"
                className="download-button"
                onClick={() => setRenderState({ status: "idle" })}
              >
                {t.savedOk}
              </button>
            </div>
          </div>
        )}
        {renderState.status === "tapAgain" && (
          <p className="success">{t.tapAgainToSave}</p>
        )}
      </div>
    </div>
  );
};
