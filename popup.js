// Extension Popup Controller

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const activeBadge = document.getElementById("activePersonaBadge");
  const personaCards = document.querySelectorAll(".persona-card");
  const btnOpenNewTab = document.getElementById("btnOpenNewTab");

  // Music elements
  const musicStatusPill = document.getElementById("musicStatusPill");
  const musicStatusText = document.getElementById("musicStatusText");
  const miniTrackTitle = document.getElementById("miniTrackTitle");
  const miniTrackChannel = document.getElementById("miniTrackChannel");
  const popupBtnPlay = document.getElementById("popupBtnPlay");
  const popupBtnNext = document.getElementById("popupBtnNext");
  const popupBtnPrev = document.getElementById("popupBtnPrev");
  const popupPlaylistUrl = document.getElementById("popupPlaylistUrl");
  const popupBtnLaunch = document.getElementById("popupBtnLaunch");
  const presetChips = document.querySelectorAll(".chip-btn");

  // Toggles
  const toggles = {
    showMusic: document.getElementById("toggleMusic"),
    showWidgets: document.getElementById("toggleWidgets"),
    showWeather: document.getElementById("toggleWeather"),
    showSearch: document.getElementById("toggleSearch"),
    showParticles: document.getElementById("toggleParticles"),
    showShortcuts: document.getElementById("toggleShortcuts")
  };

  let currentStatus = { isPlaying: false, connected: false };

  // 1. Load Persona & Widget Settings
  chrome.storage.local.get(["activePersona", "widgetSettings", "musicPlaylistUrl"], (res) => {
    const persona = res.activePersona || "otaku";
    setPersonaUI(persona);

    if (res.widgetSettings) {
      Object.keys(toggles).forEach((key) => {
        if (toggles[key] && typeof res.widgetSettings[key] !== "undefined") {
          toggles[key].checked = res.widgetSettings[key];
        }
      });
    }

    if (res.musicPlaylistUrl && popupPlaylistUrl) {
      popupPlaylistUrl.value = res.musicPlaylistUrl;
    }
  });

  // Persona switching
  personaCards.forEach((card) => {
    card.addEventListener("click", () => {
      const persona = card.getAttribute("data-persona");
      chrome.storage.local.set({ activePersona: persona }, () => {
        setPersonaUI(persona);
      });
    });
  });

  function setPersonaUI(persona) {
    personaCards.forEach((c) => {
      if (c.getAttribute("data-persona") === persona) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });
    if (activeBadge) {
      activeBadge.textContent = persona.toUpperCase();
    }
  }

  // Widget Toggles
  Object.keys(toggles).forEach((key) => {
    if (toggles[key]) {
      toggles[key].addEventListener("change", () => {
        chrome.storage.local.get("widgetSettings", (res) => {
          const current = res.widgetSettings || {};
          current[key] = toggles[key].checked;
          chrome.storage.local.set({ widgetSettings: current });
        });
      });
    }
  });

  // Open New Tab
  if (btnOpenNewTab) {
    btnOpenNewTab.addEventListener("click", () => {
      chrome.tabs.create({ url: "chrome://newtab" });
    });
  }

  // 2. Music Controller
  function syncMusic() {
    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        updateMusicUI({ connected: false });
        return;
      }
      updateMusicUI(res);
    });
  }

  function updateMusicUI(status) {
    currentStatus = status || { connected: false, isPlaying: false };

    if (musicStatusPill && musicStatusText) {
      if (currentStatus.connected) {
        musicStatusPill.classList.add("connected");
        musicStatusText.textContent = currentStatus.isPlaying ? "Playing" : "Connected";
      } else {
        musicStatusPill.classList.remove("connected");
        musicStatusText.textContent = "Disconnected";
      }
    }

    if (miniTrackTitle) {
      miniTrackTitle.textContent = currentStatus.title || (currentStatus.connected ? "Playing on YouTube" : "No Song Playing");
    }

    if (miniTrackChannel) {
      miniTrackChannel.textContent = currentStatus.channel || "YouTube Station";
    }

    if (popupBtnPlay) {
      popupBtnPlay.innerHTML = currentStatus.isPlaying
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
    }
  }

  if (popupBtnPlay) {
    popupBtnPlay.addEventListener("click", () => {
      if (!currentStatus.connected) {
        launchMusicTab(popupPlaylistUrl ? popupPlaylistUrl.value.trim() : "");
        return;
      }
      const nextCommand = currentStatus.isPlaying ? "PAUSE" : "PLAY";
      currentStatus.isPlaying = !currentStatus.isPlaying;
      updateMusicUI(currentStatus);
      chrome.runtime.sendMessage({ action: "MEDIA_COMMAND", command: nextCommand }, (res) => {
        if (res && res.status) updateMusicUI(res.status);
      });
    });
  }

  if (popupBtnNext) {
    popupBtnNext.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "MEDIA_COMMAND", command: "NEXT_TRACK" });
    });
  }

  if (popupBtnPrev) {
    popupBtnPrev.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "MEDIA_COMMAND", command: "PREV_TRACK" });
    });
  }

  function launchMusicTab(url) {
    if (!url) url = "https://www.youtube.com/watch?v=jfKfPfyJRdk";
    if (popupBtnLaunch) {
      popupBtnLaunch.innerHTML = `<span class="btn-icon-text">Launching...</span>`;
      popupBtnLaunch.disabled = true;
    }

    chrome.runtime.sendMessage({
      action: "LAUNCH_PLAYLIST_TAB",
      url: url,
      mode: "pinned"
    }, () => {
      if (popupBtnLaunch) {
        popupBtnLaunch.innerHTML = `<span class="btn-icon-text"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg> Launch</span>`;
        popupBtnLaunch.disabled = false;
      }
      setTimeout(syncMusic, 1500);
    });
  }

  if (popupBtnLaunch) {
    popupBtnLaunch.addEventListener("click", () => {
      const url = popupPlaylistUrl ? popupPlaylistUrl.value.trim() : "";
      launchMusicTab(url);
    });
  }

  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const url = chip.getAttribute("data-url");
      if (popupPlaylistUrl) popupPlaylistUrl.value = url;
      launchMusicTab(url);
    });
  });

  // Listen for broadcasted status updates
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "YOUTUBE_STATUS_UPDATE" && msg.status) {
      updateMusicUI(msg.status);
    }
  });

  syncMusic();
});
