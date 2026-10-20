// Main coordinator script for Otaku Tab

// Clock & Date Elements
const clock = document.querySelector(".clock");
const dateEl = document.querySelector(".date");
const weekDay = document.querySelector(".weekDay");

// Shortcuts & Bookmarks
const shortcutsContainer = document.querySelector(".shortcuts-container");
const addShortcut = document.querySelector("#saveShortcut");
const shortcutName = document.querySelector("#name");
const shortcutLink = document.querySelector("#url");

// Customize Panel Elements
const editBtn = document.querySelector(".edit-btn");
const closePanelBtn = document.querySelector("#btnClosePanel");
const backgroundUploadBtn = document.getElementById("bgUpload");
const resetWallpaperBtn = document.getElementById("btnResetWallpaper");
const panel = document.querySelector(".panel");
const particleColorSelector = document.querySelector(".particleColorSelector");

// Panel Music Setup
const panelPlaylistUrl = document.getElementById("panelPlaylistUrl");
const btnPanelLaunchMusic = document.getElementById("btnPanelLaunchMusic");

// Particles Canvas
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
const particles = [];
let particleColor = "rgba(255, 255, 255, 0.4)";

// ==========================================
// 1. CLOCK & DATE
// ==========================================
function updateTime() {
  const now = new Date();

  if (clock) {
    clock.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (weekDay) {
    weekDay.textContent = now.toLocaleDateString("en-US", {
      weekday: "long"
    }).toUpperCase();
  }

  if (dateEl) {
    dateEl.textContent = String(now.getDate()).padStart(2, "0");
  }
}

function startClock() {
  updateTime();
  setInterval(updateTime, 1000);
}

// ==========================================
// 2. WALLPAPER & DYNAMIC ACCENT
// ==========================================
function setBackground(src) {
  document.body.style.backgroundImage = `url(${src})`;
  chrome.storage.local.set({ wallpaper: src });
  extractTheme(src);
}

function loadStoredWallpaper(data) {
  if (data && data.wallpaper) {
    document.body.style.backgroundImage = `url(${data.wallpaper})`;
    extractTheme(data.wallpaper);
  }
}

function extractTheme(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => handleImageLoad(img);
  img.src = src;
}

function handleImageLoad(img) {
  try {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = 50;
    tempCanvas.height = 50;
    tempCtx.drawImage(img, 0, 0, 50, 50);

    const pixels = tempCtx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      count++;
    }

    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    const color = `rgb(${r}, ${g}, ${b})`;
    document.documentElement.style.setProperty("--accent", color);
  } catch (e) {
    // Canvas tainted or extraction error, keep fallback
  }
}

function handleBackgroundUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const maxSize = 3 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("Please select an image smaller than 3 MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => setBackground(e.target.result);
  reader.readAsDataURL(file);
}

function handleResetWallpaper() {
  chrome.storage.local.remove("wallpaper", () => {
    document.body.style.backgroundImage = 'url("default.jpg")';
    extractTheme("default.jpg");
  });
}

// ==========================================
// 3. PARTICLES SYSTEM
// ==========================================
function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles() {
  particles.length = 0;
  if (!canvas) return;
  const count = Math.min(100, Math.floor(window.innerWidth / 16));

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 1,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4
    });
  }
}

function drawParticle(p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = particleColor;
  ctx.fill();
}

function updateParticle(p) {
  p.x += p.dx;
  p.y += p.dy;

  if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
  if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
}

function animateParticles() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(updateParticle);
  particles.forEach(drawParticle);

  requestAnimationFrame(animateParticles);
}

function particleColorChange(e) {
  particleColor = e.target.value;
  chrome.storage.local.set({ particleColor: particleColor });
}

// ==========================================
// 4. BOOKMARKS & SHORTCUTS
// ==========================================
function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return "icons/icon16.png";
  }
}

function addShortcutToUI(bookmark) {
  if (!shortcutsContainer) return;

  const shortcut = document.createElement("a");
  shortcut.href = bookmark.url;
  shortcut.className = "shortcut";
  shortcut.id = bookmark.id;
  shortcut.target = "_blank";
  shortcut.title = bookmark.title;

  const favicon = document.createElement("img");
  favicon.src = `/_favicon/?pageUrl=${encodeURIComponent(bookmark.url)}&size=64`;
  favicon.onerror = () => {
    favicon.src = getFavicon(bookmark.url);
  };
  favicon.width = 18;
  favicon.height = 18;
  favicon.alt = bookmark.title;

  shortcut.appendChild(favicon);
  shortcutsContainer.appendChild(shortcut);
}

function handleAddShortcut() {
  const name = shortcutName.value.trim();
  let url = shortcutLink.value.trim();

  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  chrome.bookmarks.getTree((tree) => {
    const bookmarksBar = tree[0]?.children?.find(node => node.title === "Bookmarks bar") || tree[0]?.children?.[0];
    if (!bookmarksBar) return;

    chrome.bookmarks.create({
      parentId: bookmarksBar.id,
      title: name,
      url: url
    }, () => {
      shortcutName.value = "";
      shortcutLink.value = "";
      if (shortcutsContainer) shortcutsContainer.classList.remove("hidden");
    });
  });
}

function loadBookmarks() {
  if (!shortcutsContainer) return;

  chrome.bookmarks.getTree((tree) => {
    const bookmarksBar = tree[0]?.children?.find(node => node.title === "Bookmarks bar") || tree[0]?.children?.[0];
    if (!bookmarksBar || !bookmarksBar.children || bookmarksBar.children.length === 0) {
      shortcutsContainer.classList.add("hidden");
      return;
    }

    shortcutsContainer.innerHTML = "";
    bookmarksBar.children.forEach((bookmark) => {
      if (bookmark.url) {
        addShortcutToUI(bookmark);
      }
    });
  });
}

// ==========================================
// 5. PERSONA SWITCHER INTEGRATION
// ==========================================
function initPersonaSwitchers() {
  const pillBtns = document.querySelectorAll(".pill-btn");
  const panelBtns = document.querySelectorAll(".panel-persona-btn");

  function syncPersonaUI(persona) {
    pillBtns.forEach(btn => {
      if (btn.getAttribute("data-persona") === persona) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    panelBtns.forEach(btn => {
      if (btn.getAttribute("data-p") === persona) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // Load active persona
  chrome.storage.local.get("activePersona", (res) => {
    const p = res.activePersona || "otaku";
    syncPersonaUI(p);
  });

  pillBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-persona");
      if (window.OtakuWidgets) {
        window.OtakuWidgets.setPersona(p);
      }
      syncPersonaUI(p);
    });
  });

  panelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-p");
      if (window.OtakuWidgets) {
        window.OtakuWidgets.setPersona(p);
      }
      syncPersonaUI(p);
    });
  });

  // Listen to persona changes from popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.activePersona) {
      syncPersonaUI(changes.activePersona.newValue);
    }
  });
}

// ==========================================
// 6. PANEL CONTROLS
// ==========================================
function togglePanel() {
  if (panel) panel.classList.toggle("active");
}

function closePanel() {
  if (panel) panel.classList.remove("active");
}

// Initialize Customizer Panel Music Setup
function initPanelMusic() {
  if (!panelPlaylistUrl || !btnPanelLaunchMusic) return;

  chrome.storage.local.get("musicPlaylistUrl", (res) => {
    if (res.musicPlaylistUrl) {
      panelPlaylistUrl.value = res.musicPlaylistUrl;
    }
  });

  btnPanelLaunchMusic.addEventListener("click", () => {
    const url = panelPlaylistUrl.value.trim();
    if (window.OtakuMusic) {
      window.OtakuMusic.launch(url);
    } else {
      chrome.runtime.sendMessage({
        action: "LAUNCH_PLAYLIST_TAB",
        url: url,
        mode: "pinned"
      });
    }
    closePanel();
  });
}

// ==========================================
// 7. INITIALIZATION
// ==========================================
function initializeApp() {
  startClock();
  chrome.storage.local.get(["wallpaper"], loadStoredWallpaper);
  extractTheme("default.jpg");

  // Particles
  resizeCanvas();
  createParticles();
  animateParticles();

  chrome.storage.local.get("particleColor", (result) => {
    if (result.particleColor) {
      particleColor = result.particleColor;
      if (particleColorSelector) particleColorSelector.value = result.particleColor;
    }
  });

  initPersonaSwitchers();
  initPanelMusic();
  loadBookmarks();
}

// Event Listeners
if (editBtn) editBtn.addEventListener("click", togglePanel);
if (closePanelBtn) closePanelBtn.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});

if (backgroundUploadBtn) backgroundUploadBtn.addEventListener("change", handleBackgroundUpload);
if (resetWallpaperBtn) resetWallpaperBtn.addEventListener("click", handleResetWallpaper);
if (particleColorSelector) particleColorSelector.addEventListener("change", particleColorChange);
if (addShortcut) addShortcut.addEventListener("click", handleAddShortcut);

window.addEventListener("resize", () => {
  resizeCanvas();
  createParticles();
});

chrome.bookmarks.onRemoved.addListener((id) => {
  const shortcut = document.getElementById(id);
  if (shortcut) shortcut.remove();
  if (shortcutsContainer && shortcutsContainer.children.length === 0) {
    shortcutsContainer.classList.add("hidden");
  }
});

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  if (shortcutsContainer) shortcutsContainer.classList.remove("hidden");
  addShortcutToUI({ ...bookmark, id });
});

document.addEventListener("DOMContentLoaded", initializeApp);
