// Content script injected into YouTube tabs to report player state and receive control messages

(function() {
  function getTrackInfo() {
    const video = document.querySelector('video');
    
    // Extract video title
    const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                    document.querySelector('.ytp-title-link') ||
                    document.querySelector('h1.title yt-formatted-string') ||
                    document.querySelector('h1.title');
    let title = titleEl ? titleEl.textContent.trim() : '';
    if (!title && document.title) {
      title = document.title.replace(' - YouTube', '').trim();
    }
    if (!title) title = 'YouTube Video';

    // Extract channel / author
    const channelEl = document.querySelector('#channel-name #text') ||
                      document.querySelector('.ytp-title-channel-name') ||
                      document.querySelector('#owner-name a') ||
                      document.querySelector('ytd-channel-name yt-formatted-string');
    const channel = channelEl ? channelEl.textContent.trim() : 'YouTube Channel';

    // Playback state
    const isPlaying = video ? (!video.paused && !video.ended) : false;
    const currentTime = video ? video.currentTime : 0;
    const duration = video ? (isNaN(video.duration) ? 0 : video.duration) : 0;
    const volume = video ? (video.muted ? 0 : video.volume) : 1;
    const isMuted = video ? video.muted : false;

    // Thumbnail
    let thumbnail = '';
    const videoIdMatch = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch) {
      thumbnail = `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`;
    }

    return {
      connected: true,
      title: title,
      channel: channel,
      isPlaying: isPlaying,
      currentTime: currentTime,
      duration: duration,
      volume: volume,
      isMuted: isMuted,
      thumbnail: thumbnail,
      url: window.location.href
    };
  }

  function sendStatusUpdate() {
    try {
      const status = getTrackInfo();
      chrome.runtime.sendMessage({
        type: 'YOUTUBE_STATUS_UPDATE',
        status: status
      }).catch(() => {
        // Suppress disconnected port errors
      });
    } catch (e) {
      // Ignored
    }
  }

  // Hook into video element events
  function attachVideoListeners() {
    const video = document.querySelector('video');
    if (!video || video.__themeExtensionAttached) return;
    video.__themeExtensionAttached = true;

    ['play', 'pause', 'ended', 'volumechange', 'loadeddata'].forEach(evt => {
      video.addEventListener(evt, () => {
        sendStatusUpdate();
      });
    });
  }

  // Monitor DOM changes for SPA navigation (YouTube loads new videos without page reload)
  const observer = new MutationObserver(() => {
    attachVideoListeners();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(sendStatusUpdate, 500);
  });

  attachVideoListeners();

  // If on a playlist page without active video, trigger play all
  setTimeout(() => {
    if (window.location.pathname.includes('/playlist')) {
      const playAllBtn = document.querySelector('ytd-playlist-header-renderer a[href*="watch"]') ||
                         document.querySelector('a.ytd-playlist-thumbnail');
      if (playAllBtn) playAllBtn.click();
    }
  }, 1200);

  // Focus video element or player container
  function focusPlayerOrVideo() {
    const video = document.querySelector('video');
    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    if (video && typeof video.focus === 'function') {
      try { video.focus(); } catch (e) {}
    } else if (player && typeof player.focus === 'function') {
      try { player.focus(); } catch (e) {}
    }
  }

  // Dispatch key event on target
  function sendKeyEvent(target, key, keyCode, code) {
    if (!target) return;
    try {
      const eventInit = {
        key: key,
        code: code,
        keyCode: keyCode,
        which: keyCode,
        charCode: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window
      };
      target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
      target.dispatchEvent(new KeyboardEvent('keypress', eventInit));
      target.dispatchEvent(new KeyboardEvent('keyup', eventInit));
    } catch (e) {}
  }

  // Dispatch keyboard shortcut to video, player, document and window
  function triggerVideoKey(key, keyCode, code) {
    focusPlayerOrVideo();
    const video = document.querySelector('video');
    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');

    if (video) sendKeyEvent(video, key, keyCode, code);
    if (player && player !== video) sendKeyEvent(player, key, keyCode, code);
    sendKeyEvent(document, key, keyCode, code);
    sendKeyEvent(window, key, keyCode, code);
  }

  // Strictly IDEMPOTENT: only pauses, NEVER unpauses/toggles back
  function pauseVideoAction() {
    const video = document.querySelector('video');
    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');

    // 1. Focus video element / player
    focusPlayerOrVideo();

    // 2. Direct player API if available
    if (player && typeof player.pauseVideo === 'function') {
      try { player.pauseVideo(); } catch (e) {}
    }

    // 3. Native HTML5 video pause
    if (video) {
      try { video.pause(); } catch (e) {}
    }

    // 4. Focus video element and press Space if video is still not paused
    if (video && !video.paused) {
      triggerVideoKey(' ', 32, 'Space');
    }

    // 5. Try 'k' shortcut if video is still not paused
    if (video && !video.paused) {
      triggerVideoKey('k', 75, 'KeyK');
    }

    // 6. Click .ytp-play-button ONLY if still not paused and button represents Pause
    if (video && !video.paused) {
      const playBtn = document.querySelector('.ytp-play-button');
      if (playBtn) {
        const label = (playBtn.getAttribute('aria-label') || playBtn.getAttribute('title') || '').toLowerCase();
        if (label.includes('pause')) {
          playBtn.click();
        }
      }
    }
  }

  // Strictly IDEMPOTENT: only plays, NEVER pauses
  function playVideoAction() {
    const video = document.querySelector('video');
    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');

    focusPlayerOrVideo();

    if (player && typeof player.playVideo === 'function') {
      try { player.playVideo(); } catch (e) {}
    }

    if (video && (video.paused || video.ended)) {
      try { video.play().catch(() => {}); } catch (e) {}
    }

    // Press Space ONLY if still paused
    if (video && video.paused) {
      triggerVideoKey(' ', 32, 'Space');
    }

    // Press 'k' ONLY if still paused
    if (video && video.paused) {
      triggerVideoKey('k', 75, 'KeyK');
    }

    // Click play buttons ONLY if still paused
    if (!video || video.paused) {
      const playBtn = document.querySelector('.ytp-play-button');
      if (playBtn) {
        const label = (playBtn.getAttribute('aria-label') || playBtn.getAttribute('title') || '').toLowerCase();
        if (label.includes('play')) {
          playBtn.click();
        }
      }
      const largePlayBtn = document.querySelector('.ytp-large-play-button');
      if (largePlayBtn && largePlayBtn.offsetParent !== null) {
        largePlayBtn.click();
      }
    }
  }

  // Listen for actions from background script or popup/newtab
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const video = document.querySelector('video');

    switch (message.action) {
      case 'GET_STATUS': {
        sendResponse(getTrackInfo());
        return true;
      }

      case 'PLAY_PAUSE': {
        if (video) {
          if (!video.paused) {
            pauseVideoAction();
          } else {
            playVideoAction();
          }
        } else {
          const playAll = document.querySelector('ytd-playlist-header-renderer a[href*="watch"]') ||
                          document.querySelector('a.ytd-playlist-thumbnail') ||
                          document.querySelector('.ytp-large-play-button') ||
                          document.querySelector('.ytp-play-button');
          if (playAll) playAll.click();
        }
        setTimeout(() => sendResponse(getTrackInfo()), 150);
        return true;
      }

      case 'PLAY': {
        playVideoAction();
        setTimeout(() => sendResponse(getTrackInfo()), 150);
        return true;
      }

      case 'PAUSE': {
        pauseVideoAction();
        setTimeout(() => sendResponse(getTrackInfo()), 150);
        return true;
      }

      case 'NEXT_TRACK': {
        const nextBtn = document.querySelector('.ytp-next-button') ||
                        document.querySelector('a.ytp-next-button');
        if (nextBtn) {
          nextBtn.click();
        }
        setTimeout(() => sendResponse(getTrackInfo()), 400);
        return true;
      }

      case 'PREV_TRACK': {
        const prevBtn = document.querySelector('.ytp-prev-button');
        if (prevBtn) {
          prevBtn.click();
        } else if (video && video.currentTime > 3) {
          video.currentTime = 0;
        } else {
          window.history.back();
        }
        setTimeout(() => sendResponse(getTrackInfo()), 400);
        return true;
      }

      case 'SET_VOLUME': {
        if (video && typeof message.volume === 'number') {
          video.volume = Math.max(0, Math.min(1, message.volume));
          if (video.volume > 0) video.muted = false;
        }
        sendResponse(getTrackInfo());
        return true;
      }

      case 'TOGGLE_MUTE': {
        if (video) {
          video.muted = !video.muted;
        }
        sendResponse(getTrackInfo());
        return true;
      }

      case 'SEEK': {
        if (video && typeof message.time === 'number') {
          video.currentTime = Math.max(0, Math.min(video.duration || 0, message.time));
        }
        sendResponse(getTrackInfo());
        return true;
      }
    }
  });
})();
