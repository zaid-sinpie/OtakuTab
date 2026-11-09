import { defineBackground } from "wxt/sandbox";
import { MediaCommand, MusicStatus } from "@/types";

export default defineBackground(() => {
  let musicTabId: number | null = null;

  chrome.storage.local.get(["musicTabId"], (result) => {
    if (result.musicTabId) {
      chrome.tabs.get(result.musicTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          chrome.storage.local.remove("musicTabId");
        } else {
          musicTabId = tab.id ?? null;
        }
      });
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === musicTabId) {
      musicTabId = null;
      chrome.storage.local.remove("musicTabId");
      broadcastStatus({
        connected: false,
        isPlaying: false,
        title: "No music playing",
        channel: "YouTube Controller",
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        isMuted: false,
        thumbnail: "",
      });
    }
  });

  function formatPlaylistUrl(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    const url = rawUrl.trim();

    if (/^PL[a-zA-Z0-9_-]+$/.test(url)) {
      return `https://www.youtube.com/watch?list=${url}`;
    }

    try {
      const parsed = new URL(url);
      const listId = parsed.searchParams.get("list");
      if (parsed.pathname.includes("/playlist") && listId) {
        return `https://www.youtube.com/watch?list=${listId}`;
      }
      return url;
    } catch {
      if (url.includes("list=")) {
        const match = url.match(/list=([a-zA-Z0-9_-]+)/);
        if (match) return `https://www.youtube.com/watch?list=${match[1]}`;
      }
      return url;
    }
  }

  async function getTargetYouTubeTab(): Promise<chrome.tabs.Tab | null> {
    if (musicTabId) {
      try {
        const tab = await chrome.tabs.get(musicTabId);
        if (tab) {
          const tabUrl = tab.url || tab.pendingUrl || "";
          if (!tabUrl || tabUrl.includes("youtube.com")) {
            return tab;
          }
        }
      } catch {
        musicTabId = null;
        chrome.storage.local.remove("musicTabId");
      }
    }

    const ytTabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
    if (ytTabs && ytTabs.length > 0) {
      const watchTab = ytTabs.find((t) => (t.url || t.pendingUrl || "").includes("/watch"));
      return watchTab || ytTabs[0];
    }

    return null;
  }

  function ensurePlayOnTabLoad(tabId: number) {
    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(() => {
          sendToYouTubeTab(tabId, { action: "PLAY" });
          sendToYouTubeTab(tabId, { action: "GET_STATUS" }).then((status) => {
            if (status) broadcastStatus(status);
          });
        }, 1000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  }

  async function sendToYouTubeTab(tabId: number, message: unknown): Promise<MusicStatus | null> {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      return null;
    }
  }

  function broadcastStatus(status: MusicStatus) {
    chrome.runtime.sendMessage({
      type: "YOUTUBE_STATUS_UPDATE",
      status: status,
    }).catch(() => {});
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === "YOUTUBE_STATUS_UPDATE") {
      broadcastStatus(request.status);
      return false;
    }

    handleMessage(request).then(sendResponse);
    return true;
  });

  async function handleMessage(request: {
    action: string;
    command?: MediaCommand;
    url?: string;
    mode?: "pinned" | "minimized";
    seconds?: number;
    volume?: number;
  }) {
    switch (request.action) {
      case "GET_STATUS": {
        const tab = await getTargetYouTubeTab();
        if (!tab || !tab.id) {
          return { connected: false, message: "No YouTube tab found" };
        }
        const status = await sendToYouTubeTab(tab.id, { action: "GET_STATUS" });
        if (status) {
          status.tabId = tab.id;
          status.connected = true;
          return status;
        }
        return { connected: false };
      }

      case "MEDIA_COMMAND": {
        const tab = await getTargetYouTubeTab();
        if (!tab || !tab.id) {
          return { success: false, error: "No YouTube tab open" };
        }
        const result = await sendToYouTubeTab(tab.id, {
          action: request.command,
          seconds: request.seconds,
          volume: request.volume,
        });
        return { success: true, status: result };
      }

      case "LAUNCH_PLAYLIST_TAB": {
        const rawUrl = request.url ? request.url.trim() : "";
        if (!rawUrl) {
          return { success: false, error: "No playlist URL provided" };
        }
        const targetUrl = formatPlaylistUrl(rawUrl);
        chrome.storage.local.set({ musicPlaylistUrl: targetUrl });

        if (musicTabId) {
          try {
            const existingTab = await chrome.tabs.get(musicTabId);
            if (existingTab && existingTab.id) {
              await chrome.tabs.update(existingTab.id, { url: targetUrl, active: false });
              ensurePlayOnTabLoad(existingTab.id);
              return { success: true, tabId: existingTab.id, reused: true };
            }
          } catch {
            musicTabId = null;
          }
        }

        if (request.mode === "minimized") {
          const win = await chrome.windows.create({
            url: targetUrl,
            focused: false,
            state: "minimized",
          });
          const createdTab = win?.tabs?.[0];
          if (createdTab && createdTab.id) {
            musicTabId = createdTab.id;
            chrome.storage.local.set({ musicTabId: createdTab.id });
            ensurePlayOnTabLoad(createdTab.id);
            return { success: true, tabId: createdTab.id };
          }
        } else {
          const newTab = await chrome.tabs.create({
            url: targetUrl,
            pinned: true,
            active: false,
          });
          if (newTab.id) {
            musicTabId = newTab.id;
            chrome.storage.local.set({ musicTabId: newTab.id });
            ensurePlayOnTabLoad(newTab.id);
            return { success: true, tabId: newTab.id };
          }
        }
        return { success: false };
      }

      case "FOCUS_MUSIC_TAB": {
        const tab = await getTargetYouTubeTab();
        if (tab && tab.id && tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true });
          await chrome.tabs.update(tab.id, { active: true });
          return { success: true };
        }
        return { success: false };
      }

      case "RECONNECT_MUSIC_TAB": {
        musicTabId = null;
        chrome.storage.local.remove("musicTabId");
        const tab = await getTargetYouTubeTab();
        if (tab && tab.id) {
          musicTabId = tab.id;
          chrome.storage.local.set({ musicTabId: tab.id });
          const status = await sendToYouTubeTab(tab.id, { action: "GET_STATUS" });
          return { success: true, status };
        }
        return { success: false };
      }

      default:
        return { error: "Unknown action" };
    }
  }
});
