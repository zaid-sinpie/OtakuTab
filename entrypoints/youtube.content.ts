import { defineContentScript } from "wxt/sandbox";
import { MusicStatus } from "@/types";

export default defineContentScript({
  matches: ["*://*.youtube.com/*"],
  runAt: "document_idle",
  main() {
    function getTrackInfo(): MusicStatus {
      const video = document.querySelector("video");

      const titleEl =
        document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
        document.querySelector(".ytp-title-link") ||
        document.querySelector("h1.title yt-formatted-string") ||
        document.querySelector("h1.title");
      let title = titleEl ? (titleEl.textContent || "").trim() : "";
      if (!title && document.title) {
        title = document.title.replace(" - YouTube", "").trim();
      }
      if (!title) title = "YouTube Video";

      const channelEl =
        document.querySelector("#channel-name #text") ||
        document.querySelector(".ytp-title-channel-name") ||
        document.querySelector("#owner-name a") ||
        document.querySelector("ytd-channel-name yt-formatted-string");
      const channel = channelEl ? (channelEl.textContent || "").trim() : "YouTube Channel";

      const isPlaying = video ? !video.paused && !video.ended : false;
      const currentTime = video ? video.currentTime : 0;
      const duration = video ? (isNaN(video.duration) ? 0 : video.duration) : 0;
      const volume = video ? (video.muted ? 0 : video.volume) : 1;
      const isMuted = video ? video.muted : false;

      let thumbnail = "";
      const videoIdMatch = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch) {
        thumbnail = `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`;
      }

      return {
        connected: true,
        title,
        channel,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        thumbnail,
        url: window.location.href,
      };
    }

    function sendStatusUpdate() {
      try {
        const status = getTrackInfo();
        chrome.runtime.sendMessage({
          type: "YOUTUBE_STATUS_UPDATE",
          status,
        }).catch(() => {});
      } catch {}
    }

    function attachVideoListeners(): boolean {
      const video = document.querySelector("video") as (HTMLVideoElement & { __otakuAttached?: boolean }) | null;
      if (!video) return false;
      if (video.__otakuAttached) return true;
      video.__otakuAttached = true;

      ["play", "pause", "ended", "volumechange", "loadeddata"].forEach((evt) => {
        video.addEventListener(evt, () => {
          sendStatusUpdate();
        });
      });
      return true;
    }

    let observer: MutationObserver | null = null;

    function startObserving() {
      if (observer) return;
      observer = new MutationObserver(() => {
        if (attachVideoListeners() && observer) {
          observer.disconnect();
          observer = null;
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (!attachVideoListeners()) {
      startObserving();
    }

    window.addEventListener("yt-navigate-finish", () => {
      setTimeout(sendStatusUpdate, 500);
      if (!attachVideoListeners()) {
        startObserving();
      }
    });

    setTimeout(() => {
      if (window.location.pathname.includes("/playlist")) {
        const playAllBtn =
          (document.querySelector('ytd-playlist-header-renderer a[href*="watch"]') as HTMLAnchorElement | null) ||
          (document.querySelector("a.ytd-playlist-thumbnail") as HTMLAnchorElement | null);
        if (playAllBtn) playAllBtn.click();
      }
    }, 1200);

    function triggerKey(key: string, keyCode: number, code: string, shiftKey = false) {
      const video = document.querySelector("video");
      const target = video || document.body;
      const eventInit: KeyboardEventInit = {
        key,
        code,
        keyCode,
        which: keyCode,
        shiftKey,
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      target.dispatchEvent(new KeyboardEvent("keydown", eventInit));
      target.dispatchEvent(new KeyboardEvent("keyup", eventInit));
    }

    function pauseVideo() {
      const video = document.querySelector("video");
      if (video && !video.paused) {
        video.pause();
      }
      sendStatusUpdate();
    }

    function playVideo() {
      const video = document.querySelector("video");
      if (video && video.paused) {
        video.play().catch(() => {});
      }
      sendStatusUpdate();
    }

    function nextTrack() {
      const nextBtn = document.querySelector(".ytp-next-button") as HTMLButtonElement | null;
      if (nextBtn) {
        nextBtn.click();
      } else {
        triggerKey("N", 78, "KeyN", true);
      }
      setTimeout(sendStatusUpdate, 600);
    }

    function prevTrack() {
      const prevBtn = document.querySelector(".ytp-prev-button") as HTMLButtonElement | null;
      if (prevBtn) {
        prevBtn.click();
      } else {
        triggerKey("P", 80, "KeyP", true);
      }
      setTimeout(sendStatusUpdate, 600);
    }

    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      const video = document.querySelector("video");

      switch (request.action) {
        case "GET_STATUS":
          sendResponse(getTrackInfo());
          break;

        case "PLAY":
          playVideo();
          sendResponse(getTrackInfo());
          break;

        case "PAUSE":
          pauseVideo();
          sendResponse(getTrackInfo());
          break;

        case "NEXT_TRACK":
          nextTrack();
          sendResponse(getTrackInfo());
          break;

        case "PREV_TRACK":
          prevTrack();
          sendResponse(getTrackInfo());
          break;

        case "SEEK":
          if (video && typeof request.seconds === "number") {
            video.currentTime = request.seconds;
          }
          sendResponse(getTrackInfo());
          break;

        case "SET_VOLUME":
          if (video && typeof request.volume === "number") {
            video.volume = Math.max(0, Math.min(1, request.volume));
            video.muted = false;
          }
          sendResponse(getTrackInfo());
          break;

        case "TOGGLE_MUTE":
          if (video) {
            video.muted = !video.muted;
          }
          sendResponse(getTrackInfo());
          break;

        default:
          sendResponse(getTrackInfo());
          break;
      }

      return true;
    });
  },
});
