// Music Controller & Background Station Widget for Otaku Tab

(function() {
  const PRESET_PLAYLISTS = [
    {
      name: "Lofi Girl - Beats to Relax/Study",
      icon: "coffee",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk"
    },
    {
      name: "Synthwave / Cyberpunk Radio",
      icon: "radio",
      url: "https://www.youtube.com/watch?v=4xDzrJKXOOY"
    },
    {
      name: "Epic Gaming OST Mix",
      icon: "swords",
      url: "https://www.youtube.com/watch?v=WPni755-Krg"
    },
    {
      name: "Peaceful Piano & Rain Lo-Fi",
      icon: "cloud-rain",
      url: "https://www.youtube.com/watch?v=lTRiuFIWV54"
    }
  ];

  let currentStatus = {
    connected: false,
    isPlaying: false,
    title: "No music playing",
    channel: "YouTube Controller",
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    thumbnail: ""
  };

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function initMusicWidget() {
    const container = document.getElementById("music-widget-mount");
    if (!container) return;

    container.innerHTML = `
      <div class="music-card glass-panel" id="musicCard">
        <!-- Visualizer & Vinyl Cover -->
        <div class="music-header">
          <div class="music-cover-wrapper">
            <div class="music-vinyl ${currentStatus.isPlaying ? 'spinning' : ''}" id="musicCover">
              <img id="musicThumb" src="icons/icon128.png" alt="Cover" />
              <div class="vinyl-center"></div>
            </div>
            <div class="music-status-dot ${currentStatus.connected ? 'active' : ''}" id="statusDot" title="YouTube Connection Status"></div>
          </div>

          <div class="music-info">
            <div class="music-badge" id="musicBadge">YouTube Stream</div>
            <div class="music-title" id="musicTitle">Ready to Play</div>
            <div class="music-artist" id="musicArtist">Connect or Launch Station</div>
          </div>

          <button class="music-gear-btn" id="btnOpenSetup" title="Setup Music Station / Playlist URL">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>

        <!-- Equalizer Bars -->
        <div class="equalizer-container ${currentStatus.isPlaying ? 'active' : ''}" id="equalizer">
          <div class="eq-bar bar-1"></div>
          <div class="eq-bar bar-2"></div>
          <div class="eq-bar bar-3"></div>
          <div class="eq-bar bar-4"></div>
          <div class="eq-bar bar-5"></div>
          <div class="eq-bar bar-6"></div>
          <div class="eq-bar bar-7"></div>
          <div class="eq-bar bar-8"></div>
        </div>

        <!-- Progress Timeline -->
        <div class="music-progress-wrap">
          <span class="music-time" id="currentTimeText">0:00</span>
          <div class="progress-bar-track" id="progressTrack">
            <div class="progress-bar-fill" id="progressFill" style="width: 0%"></div>
          </div>
          <span class="music-time" id="durationText">0:00</span>
        </div>

        <!-- Playback Controls -->
        <div class="music-controls">
          <button class="music-btn" id="btnPrev" title="Previous Track">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button class="music-btn play-btn" id="btnPlayPause" title="Play / Pause">
            <svg id="playIcon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg id="pauseIcon" class="hidden" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>

          <button class="music-btn" id="btnNext" title="Next Track">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <!-- Volume Controls -->
          <div class="volume-container">
            <button class="music-btn vol-btn" id="btnMute" title="Mute / Unmute">
              <svg id="volHighIcon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
              <svg id="volMuteIcon" class="hidden" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            </button>
            <input type="range" class="volume-slider" id="volumeSlider" min="0" max="1" step="0.05" value="0.8" />
          </div>
        </div>

        <!-- Hidden Station Setup Modal / Drawer -->
        <div class="music-setup-drawer hidden" id="musicSetupDrawer">
          <div class="setup-header">
            <h4>
              <span class="btn-icon-text">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                YouTube Station Setup
              </span>
            </h4>
            <button class="setup-close-btn" id="btnCloseSetup">&times;</button>
          </div>
          <p class="setup-desc">Create a background or pinned music tab that can be controlled seamlessly from this theme.</p>
          
          <div class="setup-input-group">
            <input type="text" id="playlistInput" placeholder="Paste YouTube Playlist or Video URL..." />
            <button class="station-launch-btn" id="btnLaunchStation">
              <span class="btn-icon-text">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                Launch
              </span>
            </button>
          </div>

          <div class="station-mode-selector">
            <label><input type="radio" name="stationMode" value="pinned" checked /> Pinned Background Tab</label>
            <label><input type="radio" name="stationMode" value="minimized" /> Minimized Window</label>
          </div>

          <div class="setup-presets">
            <div class="presets-title">Quick Music Stations:</div>
            <div class="presets-grid" id="presetsGrid"></div>
          </div>

          <div class="setup-footer">
            <button class="secondary-action-btn" id="btnFocusTab">Bring Music Tab to Front</button>
            <button class="secondary-action-btn" id="btnRefreshTab">Reconnect YouTube Tab</button>
          </div>
        </div>
      </div>
    `;

    renderPresets();
    attachEvents();
    syncMusicStatus();
  }

  function renderPresets() {
    const grid = document.getElementById("presetsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    PRESET_PLAYLISTS.forEach(preset => {
      const btn = document.createElement("button");
      btn.className = "preset-chip";
      const iconSvg = window.LucideIcons ? LucideIcons.get(preset.icon || 'music', 13) : '';
      btn.innerHTML = `<span class="btn-icon-text">${iconSvg} <span>${preset.name}</span></span>`;
      btn.addEventListener("click", () => {
        const input = document.getElementById("playlistInput");
        if (input) input.value = preset.url;
        launchStation(preset.url);
      });
      grid.appendChild(btn);
    });
  }

  function attachEvents() {
    const btnOpenSetup = document.getElementById("btnOpenSetup");
    const btnCloseSetup = document.getElementById("btnCloseSetup");
    const setupDrawer = document.getElementById("musicSetupDrawer");
    const btnPlayPause = document.getElementById("btnPlayPause");
    const btnNext = document.getElementById("btnNext");
    const btnPrev = document.getElementById("btnPrev");
    const volumeSlider = document.getElementById("volumeSlider");
    const btnMute = document.getElementById("btnMute");
    const btnLaunchStation = document.getElementById("btnLaunchStation");
    const playlistInput = document.getElementById("playlistInput");
    const btnFocusTab = document.getElementById("btnFocusTab");
    const btnRefreshTab = document.getElementById("btnRefreshTab");
    const progressTrack = document.getElementById("progressTrack");

    // Load stored playlist URL
    chrome.storage.local.get("musicPlaylistUrl", (res) => {
      if (res.musicPlaylistUrl && playlistInput) {
        playlistInput.value = res.musicPlaylistUrl;
      }
    });

    if (btnOpenSetup && setupDrawer) {
      btnOpenSetup.addEventListener("click", () => {
        setupDrawer.classList.toggle("hidden");
      });
    }

    if (btnCloseSetup && setupDrawer) {
      btnCloseSetup.addEventListener("click", () => {
        setupDrawer.classList.add("hidden");
      });
    }

    if (btnPlayPause) {
      btnPlayPause.addEventListener("click", () => {
        const nextCommand = currentStatus.isPlaying ? "PAUSE" : "PLAY";
        currentStatus.isPlaying = !currentStatus.isPlaying;
        updateUI(currentStatus);
        sendMediaCommand(nextCommand);
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", () => sendMediaCommand("NEXT_TRACK"));
    }

    if (btnPrev) {
      btnPrev.addEventListener("click", () => sendMediaCommand("PREV_TRACK"));
    }

    if (volumeSlider) {
      volumeSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        sendMediaCommand("SET_VOLUME", { volume: val });
      });
    }

    if (btnMute) {
      btnMute.addEventListener("click", () => {
        sendMediaCommand("TOGGLE_MUTE");
      });
    }

    if (btnLaunchStation) {
      btnLaunchStation.addEventListener("click", () => {
        const url = playlistInput ? playlistInput.value.trim() : "";
        launchStation(url);
      });
    }

    if (btnFocusTab) {
      btnFocusTab.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "FOCUS_MUSIC_TAB" });
      });
    }

    if (btnRefreshTab) {
      btnRefreshTab.addEventListener("click", () => {
        syncMusicStatus();
      });
    }

    if (progressTrack) {
      progressTrack.addEventListener("click", (e) => {
        if (!currentStatus.duration) return;
        const rect = progressTrack.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const seekTime = ratio * currentStatus.duration;
        sendMediaCommand("SEEK", { time: seekTime });
      });
    }
  }

  function launchStation(customUrl) {
    const input = document.getElementById("playlistInput");
    const url = customUrl || (input ? input.value.trim() : '') || PRESET_PLAYLISTS[0].url;
    const modeEl = document.querySelector('input[name="stationMode"]:checked');
    const mode = modeEl ? modeEl.value : 'pinned';

    const launchBtn = document.getElementById("btnLaunchStation");
    if (launchBtn) {
      launchBtn.innerHTML = `<span class="btn-icon-text">Launching...</span>`;
      launchBtn.disabled = true;
    }

    currentStatus.connected = true;
    currentStatus.title = "Connecting to YouTube...";
    currentStatus.channel = "Station Launching";
    updateUI(currentStatus);

    chrome.runtime.sendMessage({
      action: "LAUNCH_PLAYLIST_TAB",
      url: url,
      mode: mode
    }, (res) => {
      if (launchBtn) {
        launchBtn.innerHTML = `<span class="btn-icon-text"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg> Launch</span>`;
        launchBtn.disabled = false;
      }
      const setupDrawer = document.getElementById("musicSetupDrawer");
      if (setupDrawer) setupDrawer.classList.add("hidden");

      setTimeout(syncMusicStatus, 1000);
      setTimeout(syncMusicStatus, 2500);
      setTimeout(syncMusicStatus, 4500);
    });
  }

  function sendMediaCommand(cmd, extra = {}) {
    chrome.runtime.sendMessage({
      action: "MEDIA_COMMAND",
      command: cmd,
      ...extra
    }, (res) => {
      if (res && res.status) {
        updateUI(res.status);
      }
    });
  }

  function syncMusicStatus() {
    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        updateUI({ connected: false });
        return;
      }
      updateUI(res);
    });
  }

  function updateUI(status) {
    if (!status) return;
    currentStatus = { ...currentStatus, ...status };

    const musicTitle = document.getElementById("musicTitle");
    const musicArtist = document.getElementById("musicArtist");
    const musicBadge = document.getElementById("musicBadge");
    const musicThumb = document.getElementById("musicThumb");
    const musicCover = document.getElementById("musicCover");
    const statusDot = document.getElementById("statusDot");
    const equalizer = document.getElementById("equalizer");
    const playIcon = document.getElementById("playIcon");
    const pauseIcon = document.getElementById("pauseIcon");
    const progressFill = document.getElementById("progressFill");
    const currentTimeText = document.getElementById("currentTimeText");
    const durationText = document.getElementById("durationText");
    const volumeSlider = document.getElementById("volumeSlider");
    const volHighIcon = document.getElementById("volHighIcon");
    const volMuteIcon = document.getElementById("volMuteIcon");

    if (musicTitle) {
      musicTitle.textContent = currentStatus.title || (currentStatus.connected ? "Playing on YouTube" : "Ready to Play");
      musicTitle.title = currentStatus.title || "";
    }

    if (musicArtist) {
      musicArtist.textContent = currentStatus.channel || (currentStatus.connected ? "Connected YouTube Tab" : "Click Settings to setup playlist");
    }

    if (musicBadge) {
      musicBadge.textContent = currentStatus.connected ? (currentStatus.isPlaying ? "Playing Live" : "Paused") : "Offline Station";
      musicBadge.className = `music-badge ${currentStatus.connected ? (currentStatus.isPlaying ? 'badge-live' : 'badge-paused') : ''}`;
    }

    if (musicThumb && currentStatus.thumbnail) {
      musicThumb.src = currentStatus.thumbnail;
    }

    if (musicCover) {
      if (currentStatus.isPlaying) {
        musicCover.classList.add("spinning");
      } else {
        musicCover.classList.remove("spinning");
      }
    }

    if (statusDot) {
      if (currentStatus.connected) {
        statusDot.classList.add("active");
        statusDot.title = "Connected to YouTube Tab";
      } else {
        statusDot.classList.remove("active");
        statusDot.title = "No active YouTube tab found";
      }
    }

    if (equalizer) {
      if (currentStatus.isPlaying) {
        equalizer.classList.add("active");
      } else {
        equalizer.classList.remove("active");
      }
    }

    if (playIcon && pauseIcon) {
      if (currentStatus.isPlaying) {
        playIcon.classList.add("hidden");
        pauseIcon.classList.remove("hidden");
      } else {
        playIcon.classList.remove("hidden");
        pauseIcon.classList.add("hidden");
      }
    }

    if (currentTimeText) {
      currentTimeText.textContent = formatTime(currentStatus.currentTime);
    }

    if (durationText) {
      durationText.textContent = formatTime(currentStatus.duration);
    }

    if (progressFill && currentStatus.duration > 0) {
      const pct = Math.min(100, Math.max(0, (currentStatus.currentTime / currentStatus.duration) * 100));
      progressFill.style.width = `${pct}%`;
    }

    if (volumeSlider && typeof currentStatus.volume === 'number' && !document.activeElement?.isSameNode(volumeSlider)) {
      volumeSlider.value = currentStatus.isMuted ? 0 : currentStatus.volume;
    }

    if (volHighIcon && volMuteIcon) {
      if (currentStatus.isMuted || currentStatus.volume === 0) {
        volHighIcon.classList.add("hidden");
        volMuteIcon.classList.remove("hidden");
      } else {
        volHighIcon.classList.remove("hidden");
        volMuteIcon.classList.add("hidden");
      }
    }
  }

  // Listen for broadcasted status updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'YOUTUBE_STATUS_UPDATE' && msg.status) {
      updateUI(msg.status);
    }
  });

  // Regular heartbeat poll every 3 seconds to keep progress updated
  setInterval(() => {
    syncMusicStatus();
  }, 3000);

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusicWidget);
  } else {
    initMusicWidget();
  }

  window.OtakuMusic = {
    sync: syncMusicStatus,
    launch: launchStation
  };
})();
