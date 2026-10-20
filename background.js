// Background service worker managing YouTube music playback & hidden/background tabs

let musicTabId = null;

// Initialize stored music tab ID
chrome.storage.local.get(['musicTabId', 'musicPlaylistUrl'], (result) => {
  if (result.musicTabId) {
    chrome.tabs.get(result.musicTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        chrome.storage.local.remove('musicTabId');
      } else {
        musicTabId = tab.id;
      }
    });
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === musicTabId) {
    musicTabId = null;
    chrome.storage.local.remove('musicTabId');
    broadcastStatus({ connected: false, message: 'Music tab was closed' });
  }
});

// Helper: Format Playlist URL to watch URL so YouTube autoplays
function formatPlaylistUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // If user pasted bare playlist ID
  if (/^PL[a-zA-Z0-9_-]+$/.test(url)) {
    return `https://www.youtube.com/watch?list=${url}`;
  }

  try {
    const parsed = new URL(url);
    const listId = parsed.searchParams.get('list');
    const videoId = parsed.searchParams.get('v');

    if (parsed.pathname.includes('/playlist') && listId) {
      return `https://www.youtube.com/watch?list=${listId}`;
    }
    return url;
  } catch (e) {
    if (url.includes('list=')) {
      const match = url.match(/list=([a-zA-Z0-9_-]+)/);
      if (match) return `https://www.youtube.com/watch?list=${match[1]}`;
    }
    return url;
  }
}

// Find target YouTube tab (prefer stored music tab, else any active/playing youtube tab)
async function getTargetYouTubeTab() {
  if (musicTabId) {
    try {
      const tab = await chrome.tabs.get(musicTabId);
      if (tab) {
        const tabUrl = tab.url || tab.pendingUrl || '';
        if (!tabUrl || tabUrl.includes('youtube.com')) {
          return tab;
        }
      }
    } catch (e) {
      musicTabId = null;
      chrome.storage.local.remove('musicTabId');
    }
  }

  // Find any open YouTube tab
  const ytTabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
  if (ytTabs && ytTabs.length > 0) {
    // Prefer watch pages over home/feed
    const watchTab = ytTabs.find(t => (t.url || t.pendingUrl || '').includes('/watch'));
    return watchTab || ytTabs[0];
  }

  return null;
}

// Auto-trigger playback once launched tab is loaded
function ensurePlayOnTabLoad(tabId) {
  const listener = (updatedTabId, changeInfo) => {
    if (updatedTabId === tabId && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(() => {
        sendToYouTubeTab(tabId, { action: 'PLAY' });
        sendToYouTubeTab(tabId, { action: 'GET_STATUS' }).then(status => {
          if (status) broadcastStatus(status);
        });
      }, 1000);
    }
  };
  chrome.tabs.onUpdated.addListener(listener);
}

// Safely send message to YouTube tab, auto-injecting content script if needed
async function sendToYouTubeTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // Attempt to inject content script and retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content_youtube.js']
      });
      // Small pause for initialization
      await new Promise(r => setTimeout(r, 200));
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (injectErr) {
      console.warn('Failed to communicate with YouTube tab:', injectErr);
      return null;
    }
  }
}

// Broadcast status to all extension views
function broadcastStatus(status) {
  chrome.runtime.sendMessage({
    type: 'YOUTUBE_STATUS_UPDATE',
    status: status
  }).catch(() => {});
}

// Listen for messages from popup or newTab
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // If update came from content script, forward to popup / newtab
  if (request.type === 'YOUTUBE_STATUS_UPDATE') {
    broadcastStatus(request.status);
    return false;
  }

  handleMessage(request).then(sendResponse);
  return true; // async sendResponse
});

async function handleMessage(request) {
  switch (request.action) {
    case 'GET_STATUS': {
      const tab = await getTargetYouTubeTab();
      if (!tab) {
        return { connected: false, message: 'No YouTube tab found' };
      }
      const status = await sendToYouTubeTab(tab.id, { action: 'GET_STATUS' });
      if (status) {
        status.tabId = tab.id;
        status.connected = true;
        return status;
      }
      return { connected: true, tabId: tab.id, title: tab.title || 'YouTube Tab', isPlaying: false };
    }

    case 'MEDIA_COMMAND': {
      let tab = await getTargetYouTubeTab();
      if (!tab) {
        // If no active YouTube tab, launch from stored playlist
        const stored = await chrome.storage.local.get(['musicPlaylistUrl']);
        const url = stored.musicPlaylistUrl || 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
        const launchRes = await handleMessage({ action: 'LAUNCH_PLAYLIST_TAB', url: url, mode: 'pinned' });
        return { success: true, launched: true, tabId: launchRes.tabId };
      }

      // Execute directly in MAIN world of YouTube tab
      let resolvedAction = request.command; // 'PLAY', 'PAUSE', 'PLAY_PAUSE', etc.

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: (cmd, extraVol, extraTime) => {
            const player = document.getElementById('movie_player');
            const video = document.querySelector('video');

            const isPlaying = (player && typeof player.getPlayerState === 'function')
              ? (player.getPlayerState() === 1 || player.getPlayerState() === 3)
              : (video && !video.paused && !video.ended);

            let actionToRun = cmd;
            if (cmd === 'PLAY_PAUSE') {
              actionToRun = isPlaying ? 'PAUSE' : 'PLAY';
            }

            if (actionToRun === 'PAUSE') {
              if (player && typeof player.pauseVideo === 'function') {
                try { player.pauseVideo(); } catch (e) {}
              }
              if (video) {
                try { video.pause(); } catch (e) {}
              }
            } else if (actionToRun === 'PLAY') {
              if (player && typeof player.playVideo === 'function') {
                try { player.playVideo(); } catch (e) {}
              }
              if (video) {
                try { video.play().catch(() => {}); } catch (e) {}
              }
            } else if (actionToRun === 'NEXT_TRACK') {
              if (player && typeof player.nextVideo === 'function') {
                player.nextVideo();
              } else {
                const nextBtn = document.querySelector('.ytp-next-button');
                if (nextBtn) nextBtn.click();
              }
            } else if (actionToRun === 'PREV_TRACK') {
              if (player && typeof player.previousVideo === 'function') {
                player.previousVideo();
              } else {
                const prevBtn = document.querySelector('.ytp-prev-button');
                if (prevBtn) prevBtn.click();
              }
            } else if (actionToRun === 'SET_VOLUME') {
              if (typeof extraVol === 'number') {
                if (player && typeof player.setVolume === 'function') player.setVolume(extraVol * 100);
                if (video) video.volume = extraVol;
              }
            } else if (actionToRun === 'SEEK') {
              if (typeof extraTime === 'number') {
                if (player && typeof player.seekTo === 'function') player.seekTo(extraTime, true);
                if (video) video.currentTime = extraTime;
              }
            }

            return { executed: true, action: actionToRun };
          },
          args: [request.command, request.volume, request.time]
        });

        if (results && results[0] && results[0].result && results[0].result.executed) {
          resolvedAction = results[0].result.action;
        }
      } catch (mainWorldErr) {
        // Non-critical if main world injection falls back to content script
      }

      // Send the resolved explicit command to content script so its listeners and status update
      const response = await sendToYouTubeTab(tab.id, {
        action: resolvedAction,
        volume: request.volume,
        time: request.time
      });

      if (response) {
        broadcastStatus(response);
      }

      return { success: true, tabId: tab.id, status: response };
    }

    case 'LAUNCH_PLAYLIST_TAB': {
      const formattedUrl = formatPlaylistUrl(request.url || 'https://www.youtube.com/watch?v=jfKfPfyJRdk&list=PLr4sV_X1jZ0iF88n21xYf9eFvC_GqWf8p');
      const isMinimized = request.mode === 'minimized';

      // Store preferred playlist URL
      await chrome.storage.local.set({ musicPlaylistUrl: request.url });

      if (musicTabId) {
        try {
          const tab = await chrome.tabs.get(musicTabId);
          if (tab) {
            await chrome.tabs.update(musicTabId, { url: formattedUrl, active: false });
            ensurePlayOnTabLoad(musicTabId);
            return { success: true, tabId: musicTabId, updated: true };
          }
        } catch (e) {
          musicTabId = null;
        }
      }

      if (isMinimized) {
        // Create a minimized window playing the playlist in the background
        const win = await chrome.windows.create({
          url: formattedUrl,
          focused: false,
          state: 'minimized'
        });
        if (win.tabs && win.tabs.length > 0) {
          musicTabId = win.tabs[0].id;
        }
      } else {
        // Create pinned background tab
        const tab = await chrome.tabs.create({
          url: formattedUrl,
          pinned: true,
          active: false
        });
        musicTabId = tab.id;
      }

      ensurePlayOnTabLoad(musicTabId);
      await chrome.storage.local.set({ musicTabId: musicTabId });
      return { success: true, tabId: musicTabId, created: true, url: formattedUrl };
    }

    case 'FOCUS_MUSIC_TAB': {
      const tab = await getTargetYouTubeTab();
      if (tab) {
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        return { success: true };
      }
      return { success: false };
    }

    case 'LIST_YT_TABS': {
      const ytTabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      return {
        tabs: ytTabs.map(t => ({
          id: t.id,
          title: t.title,
          url: t.url,
          isMusicTab: t.id === musicTabId
        }))
      };
    }

    case 'SET_ACTIVE_MUSIC_TAB': {
      if (request.tabId) {
        musicTabId = request.tabId;
        await chrome.storage.local.set({ musicTabId: musicTabId });
        return { success: true };
      }
      return { success: false };
    }

    default:
      return { error: 'Unknown action' };
  }
}
