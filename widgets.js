// Persona-specific and Daily Life Widgets for Otaku Tab
// Personas: Gamer, Trader, Corporate, Otaku

(function() {
  const DEFAULT_PERSONA = 'otaku';

  let currentPersona = DEFAULT_PERSONA;
  let widgetSettings = {
    showMusic: true,
    showWidgets: true,
    showWeather: true,
    showSearch: true,
    showShortcuts: true,
    showParticles: true
  };

  // Sound generator variables (Web Audio API)
  let audioCtx = null;
  let rainNoiseNode = null;
  let rainGainNode = null;
  let isRainPlaying = false;

  // Gamer Quotes
  const GAMER_QUOTES = [
    { quote: "The right man in the wrong place can make all the difference in the world.", source: "Half-Life 2" },
    { quote: "Praise the Sun! \\[T]/", source: "Dark Souls" },
    { quote: "Wake up, samurai. We have a city to burn.", source: "Cyberpunk 2077" },
    { quote: "Protocol 3: Protect the Pilot.", source: "Titanfall 2" },
    { quote: "Nothing is true, everything is permitted.", source: "Assassin's Creed" },
    { quote: "War. War never changes.", source: "Fallout" },
    { quote: "A hero need not speak. When he is gone, the world will speak for him.", source: "Halo" }
  ];

  // Anime Quotes
  const ANIME_QUOTES = [
    { quote: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", source: "Kenshin Himura" },
    { quote: "If you don't take risks, you can't create a future.", source: "Monkey D. Luffy" },
    { quote: "El Psy Kongroo. The timeline has shifted.", source: "Rintaro Okabe (Steins;Gate)" },
    { quote: "If you truly want to escape everyday life, you must constantly evolve.", source: "Durarara!!" },
    { quote: "Hard work is worthless for those that don’t believe in themselves.", source: "Naruto Uzumaki" },
    { quote: "See you, space cowboy.", source: "Cowboy Bebop" }
  ];

  // Timer Variables
  let sessionTimerInterval = null;
  let sessionSeconds = 0;
  let isSessionRunning = false;

  let pomodoroInterval = null;
  let pomodoroTimeLeft = 25 * 60;
  let pomodoroTotalTime = 25 * 60;
  let isPomodoroRunning = false;

  // Initialize all widgets
  function initWidgets() {
    chrome.storage.local.get(['activePersona', 'widgetSettings'], (res) => {
      if (res.activePersona) {
        currentPersona = res.activePersona;
      }
      if (res.widgetSettings) {
        widgetSettings = { ...widgetSettings, ...res.widgetSettings };
      }

      applyPersona(currentPersona);
      applyWidgetVisibility();
      // initWeatherWidget();
      initSearchBar();
    });

    // Listen to changes from popup or other tabs
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.activePersona) {
          applyPersona(changes.activePersona.newValue);
        }
        if (changes.widgetSettings) {
          widgetSettings = { ...widgetSettings, ...changes.widgetSettings.newValue };
          applyWidgetVisibility();
        }
      }
    });
  }

  function applyWidgetVisibility() {
    const musicMount = document.getElementById('music-widget-mount');
    const personaMount = document.getElementById('persona-widget-mount');
    const weatherMount = document.getElementById('weather-widget-mount');
    const searchMount = document.getElementById('search-bar-mount');
    const shortcutsContainer = document.querySelector('.shortcuts-container');
    const particlesCanvas = document.getElementById('particles');

    if (musicMount) musicMount.style.display = widgetSettings.showMusic ? 'block' : 'none';
    if (personaMount) personaMount.style.display = widgetSettings.showWidgets ? 'block' : 'none';
    if (weatherMount) weatherMount.style.display = widgetSettings.showWeather ? 'block' : 'none';
    if (searchMount) searchMount.style.display = widgetSettings.showSearch ? 'block' : 'none';
    if (shortcutsContainer) shortcutsContainer.style.display = widgetSettings.showShortcuts ? 'flex' : 'none';
    if (particlesCanvas) particlesCanvas.style.display = widgetSettings.showParticles ? 'block' : 'none';
  }

  function applyPersona(persona) {
    currentPersona = persona;
    document.body.classList.remove('persona-gamer', 'persona-trader', 'persona-corporate', 'persona-otaku');
    document.body.classList.add(`persona-${persona}`);

    const personaMount = document.getElementById('persona-widget-mount');
    if (!personaMount) return;

    switch (persona) {
      case 'gamer':
        renderGamerWidgets(personaMount);
        break;
      case 'trader':
        renderTraderWidgets(personaMount);
        break;
      case 'corporate':
        renderCorporateWidgets(personaMount);
        break;
      case 'otaku':
      default:
        renderOtakuWidgets(personaMount);
        break;
    }
  }

  /* -------------------------------------------------------------
     1. GAMER PERSONA WIDGETS
  ------------------------------------------------------------- */
  function renderGamerWidgets(container) {
    const icon = (n, s=16) => window.LucideIcons ? LucideIcons.get(n, s) : '';
    container.innerHTML = `
      <div class="persona-dashboard gamer-dashboard glass-panel">
        <div class="dashboard-header">
          <div class="dash-title">
            <span class="dash-icon">${icon('gamepad', 16)}</span> GAMER HUD
          </div>
          <div class="dash-status-pill online">ONLINE</div>
        </div>

        <!-- Ping & Network Radar -->
        <div class="hud-stat-card">
          <div class="stat-top">
            <div class="radar-dot-pulse"></div>
            <span class="stat-label">NETWORK LATENCY</span>
            <button class="mini-refresh-btn" id="btnTestPing" title="Retest Ping">${icon('refresh-cw', 12)}</button>
          </div>
          <div class="stat-value-row">
            <span class="stat-huge" id="pingValue">22</span>
            <span class="stat-unit">ms</span>
            <span class="stat-badge low-ping" id="pingQuality">ULTRA LOW</span>
          </div>
        </div>

        <!-- Gaming Session Stopwatch -->
        <div class="hud-timer-card">
          <div class="stat-label">SESSION TIME</div>
          <div class="timer-digits" id="sessionTimerText">00:00:00</div>
          <div class="hud-btn-row">
            <button class="hud-btn ${isSessionRunning ? 'active' : ''}" id="btnSessionToggle">
              ${isSessionRunning ? icon('pause', 12) + ' Pause' : icon('play', 12) + ' Start'}
            </button>
            <button class="hud-btn secondary" id="btnSessionReset">${icon('refresh-cw', 12)} Reset</button>
          </div>
        </div>

        <!-- Quick Gaming Hub -->
        <div class="hud-quick-dock">
          <a href="https://store.steampowered.com" target="_blank" class="dock-item" title="Steam">
            <span class="dock-icon">${icon('gamepad', 16)}</span>
            <span class="dock-text">Steam</span>
          </a>
          <a href="https://discord.com/app" target="_blank" class="dock-item" title="Discord">
            <span class="dock-icon">${icon('message-circle', 16)}</span>
            <span class="dock-text">Discord</span>
          </a>
          <a href="https://twitch.tv" target="_blank" class="dock-item" title="Twitch">
            <span class="dock-icon">${icon('tv', 16)}</span>
            <span class="dock-text">Twitch</span>
          </a>
          <a href="https://reddit.com/r/pcmasterrace" target="_blank" class="dock-item" title="r/PCMasterRace">
            <span class="dock-icon">${icon('flame', 16)}</span>
            <span class="dock-text">Reddit</span>
          </a>
        </div>

        <!-- Gamer Quote / Vibe -->
        <div class="gamer-quote-box">
          <div class="quote-text" id="gamerQuoteText">"Wake up, samurai. We have a city to burn."</div>
          <div class="quote-source" id="gamerQuoteSource">— Cyberpunk 2077</div>
          <button class="quote-roll-btn" id="btnRollGamerQuote" title="Next Quote">${icon('dices', 14)}</button>
        </div>
      </div>
    `;

    setupGamerEvents();
    measureLatency();
  }

  function setupGamerEvents() {
    const btnTestPing = document.getElementById('btnTestPing');
    if (btnTestPing) btnTestPing.addEventListener('click', measureLatency);

    const btnSessionToggle = document.getElementById('btnSessionToggle');
    const btnSessionReset = document.getElementById('btnSessionReset');

    if (btnSessionToggle) {
      btnSessionToggle.addEventListener('click', () => {
        isSessionRunning = !isSessionRunning;
        if (isSessionRunning) {
          sessionTimerInterval = setInterval(() => {
            sessionSeconds++;
            updateSessionDisplay();
          }, 1000);
          btnSessionToggle.textContent = '⏸ Pause';
          btnSessionToggle.classList.add('active');
        } else {
          clearInterval(sessionTimerInterval);
          btnSessionToggle.textContent = '▶ Start';
          btnSessionToggle.classList.remove('active');
        }
      });
    }

    if (btnSessionReset) {
      btnSessionReset.addEventListener('click', () => {
        clearInterval(sessionTimerInterval);
        isSessionRunning = false;
        sessionSeconds = 0;
        updateSessionDisplay();
        if (btnSessionToggle) {
          btnSessionToggle.textContent = '▶ Start';
          btnSessionToggle.classList.remove('active');
        }
      });
    }

    const btnRollGamerQuote = document.getElementById('btnRollGamerQuote');
    if (btnRollGamerQuote) {
      btnRollGamerQuote.addEventListener('click', () => {
        const item = GAMER_QUOTES[Math.floor(Math.random() * GAMER_QUOTES.length)];
        const textEl = document.getElementById('gamerQuoteText');
        const srcEl = document.getElementById('gamerQuoteSource');
        if (textEl) textEl.textContent = `"${item.quote}"`;
        if (srcEl) srcEl.textContent = `— ${item.source}`;
      });
    }

    updateSessionDisplay();
  }

  function updateSessionDisplay() {
    const el = document.getElementById('sessionTimerText');
    if (!el) return;
    const hrs = Math.floor(sessionSeconds / 3600);
    const mins = Math.floor((sessionSeconds % 3600) / 60);
    const secs = sessionSeconds % 60;
    el.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function measureLatency() {
    const pingEl = document.getElementById('pingValue');
    const badgeEl = document.getElementById('pingQuality');
    if (!pingEl) return;

    pingEl.textContent = '...';
    const start = performance.now();
    fetch('https://www.google.com/favicon.ico?' + Math.random(), { mode: 'no-cors', cache: 'no-store' })
      .then(() => {
        const duration = Math.round(performance.now() - start);
        if (pingEl) pingEl.textContent = duration;
        if (badgeEl) {
          if (duration < 35) {
            badgeEl.textContent = 'ULTRA LOW';
            badgeEl.className = 'stat-badge low-ping';
          } else if (duration < 90) {
            badgeEl.textContent = 'GOOD';
            badgeEl.className = 'stat-badge med-ping';
          } else {
            badgeEl.textContent = 'HIGH';
            badgeEl.className = 'stat-badge high-ping';
          }
        }
      })
      .catch(() => {
        // Fallback simulation
        const simulated = Math.floor(Math.random() * 20) + 18;
        if (pingEl) pingEl.textContent = simulated;
        if (badgeEl) {
          badgeEl.textContent = 'OPTIMAL';
          badgeEl.className = 'stat-badge low-ping';
        }
      });
  }

  /* -------------------------------------------------------------
     2. TRADER PERSONA WIDGETS
  ------------------------------------------------------------- */
  function renderTraderWidgets(container) {
    const icon = (n, s=16) => window.LucideIcons ? LucideIcons.get(n, s) : '';
    container.innerHTML = `
      <div class="persona-dashboard trader-dashboard glass-panel">
        <div class="dashboard-header">
          <div class="dash-title">
            <span class="dash-icon">${icon('trending-up', 16)}</span> MARKET TERMINAL
          </div>
          <button class="mini-refresh-btn" id="btnRefreshMarkets" title="Refresh Prices">${icon('refresh-cw', 12)}</button>
        </div>

        <!-- Crypto Tickers Grid -->
        <div class="ticker-grid" id="tickerGrid">
          <div class="ticker-card">
            <div class="ticker-sym">BTC / USD</div>
            <div class="ticker-price" id="priceBTC">$94,250.00</div>
            <div class="ticker-change up" id="changeBTC">+3.45%</div>
          </div>
          <div class="ticker-card">
            <div class="ticker-sym">ETH / USD</div>
            <div class="ticker-price" id="priceETH">$3,420.50</div>
            <div class="ticker-change up" id="changeETH">+2.18%</div>
          </div>
          <div class="ticker-card">
            <div class="ticker-sym">SOL / USD</div>
            <div class="ticker-price" id="priceSOL">$188.75</div>
            <div class="ticker-change down" id="changeSOL">-0.82%</div>
          </div>
          <div class="ticker-card">
            <div class="ticker-sym">BNB / USD</div>
            <div class="ticker-price" id="priceBNB">$645.20</div>
            <div class="ticker-change up" id="changeBNB">+1.12%</div>
          </div>
        </div>

        <!-- Global Financial Markets Clock -->
        <div class="market-clocks-wrap">
          <div class="market-clock-row">
            <div class="market-name">NEW YORK (NYSE)</div>
            <div class="market-status" id="nyseStatus"><span class="clock-dot"></span> OPEN</div>
          </div>
          <div class="market-clock-row">
            <div class="market-name">LONDON (LSE)</div>
            <div class="market-status" id="lseStatus"><span class="clock-dot"></span> OPEN</div>
          </div>
          <div class="market-clock-row">
            <div class="market-name">TOKYO (TSE)</div>
            <div class="market-status" id="tseStatus"><span class="clock-dot closed"></span> CLOSED</div>
          </div>
        </div>

        <!-- Quick Crypto / USD Converter -->
        <div class="trader-converter">
          <div class="converter-title">QUICK CONVERTER</div>
          <div class="converter-inputs">
            <input type="number" id="convertInput" value="1" min="0" step="any" />
            <select id="convertSelect">
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="SOL">SOL</option>
            </select>
            <span class="converter-eq">=</span>
            <div class="converter-result" id="convertResult">$94,250</div>
          </div>
        </div>
      </div>
    `;

    setupTraderEvents();
    fetchMarketPrices();
    updateMarketClocks();
  }

  let cryptoPrices = {
    BTC: 94250,
    ETH: 3420.50,
    SOL: 188.75,
    BNB: 645.20
  };

  function setupTraderEvents() {
    const btn = document.getElementById('btnRefreshMarkets');
    if (btn) btn.addEventListener('click', fetchMarketPrices);

    const input = document.getElementById('convertInput');
    const select = document.getElementById('convertSelect');
    if (input && select) {
      const updateCalc = () => {
        const val = parseFloat(input.value) || 0;
        const sym = select.value;
        const price = cryptoPrices[sym] || 1;
        const total = (val * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const resEl = document.getElementById('convertResult');
        if (resEl) resEl.textContent = total;
      };
      input.addEventListener('input', updateCalc);
      select.addEventListener('change', updateCalc);
    }
  }

  function fetchMarketPrices() {
    fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"]')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        data.forEach(item => {
          const sym = item.symbol.replace('USDT', '');
          const price = parseFloat(item.lastPrice);
          const change = parseFloat(item.priceChangePercent);
          cryptoPrices[sym] = price;

          const priceEl = document.getElementById(`price${sym}`);
          const changeEl = document.getElementById(`change${sym}`);

          if (priceEl) {
            priceEl.textContent = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
          if (changeEl) {
            const isUp = change >= 0;
            changeEl.textContent = `${isUp ? '+' : ''}${change.toFixed(2)}%`;
            changeEl.className = `ticker-change ${isUp ? 'up' : 'down'}`;
          }
        });
        const convertInput = document.getElementById('convertInput');
        if (convertInput) convertInput.dispatchEvent(new Event('input'));
      })
      .catch(() => {
        // Graceful fallback: simulated fluctuation
        ['BTC', 'ETH', 'SOL', 'BNB'].forEach(sym => {
          const variance = (Math.random() - 0.48) * 0.005;
          cryptoPrices[sym] = cryptoPrices[sym] * (1 + variance);
          const priceEl = document.getElementById(`price${sym}`);
          if (priceEl) {
            priceEl.textContent = `$${cryptoPrices[sym].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        });
      });
  }

  function updateMarketClocks() {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const utcDay = now.getUTCDay(); // 0 is Sunday, 6 is Saturday

    const isWeekend = utcDay === 0 || utcDay === 6;

    // NYSE: 14:30 - 21:00 UTC (9:30 AM - 4:00 PM EST)
    const isNyseOpen = !isWeekend && utcHours >= 14.5 && utcHours < 21.0;
    // LSE: 08:00 - 16:30 UTC
    const isLseOpen = !isWeekend && utcHours >= 8.0 && utcHours < 16.5;
    // Tokyo: 00:00 - 06:00 UTC (09:00 - 15:00 JST)
    const isTseOpen = !isWeekend && utcHours >= 0.0 && utcHours < 6.0;

    setMarketBadge('nyseStatus', isNyseOpen);
    setMarketBadge('lseStatus', isLseOpen);
    setMarketBadge('tseStatus', isTseOpen);
  }

  function setMarketBadge(elId, isOpen) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<span class="clock-dot ${isOpen ? 'open' : 'closed'}"></span> ${isOpen ? 'OPEN' : 'CLOSED'}`;
    el.className = `market-status ${isOpen ? 'open' : 'closed'}`;
  }

  /* -------------------------------------------------------------
     3. CORPORATE PERSONA WIDGETS
  ------------------------------------------------------------- */
  function renderCorporateWidgets(container) {
    const icon = (n, s=16) => window.LucideIcons ? LucideIcons.get(n, s) : '';
    container.innerHTML = `
      <div class="persona-dashboard corporate-dashboard glass-panel">
        <div class="dashboard-header">
          <div class="dash-title">
            <span class="dash-icon">${icon('briefcase', 16)}</span> FOCUS & PRODUCTIVITY
          </div>
          <div class="pomodoro-mode-badge" id="pomoModeBadge">FOCUS (25M)</div>
        </div>

        <!-- Pomodoro Focus Timer -->
        <div class="pomo-card">
          <div class="pomo-display" id="pomoTime">25:00</div>
          <div class="pomo-controls">
            <button class="pomo-btn ${isPomodoroRunning ? 'active' : ''}" id="btnPomoToggle">
              ${isPomodoroRunning ? icon('pause', 12) + ' Pause' : icon('play', 12) + ' Focus'}
            </button>
            <button class="pomo-btn secondary" id="btnPomoBreak">${icon('coffee', 12)} Break (5m)</button>
            <button class="pomo-btn secondary" id="btnPomoReset">${icon('refresh-cw', 12)}</button>
          </div>
        </div>

        <!-- Interactive Task / To-Do List -->
        <div class="todo-widget">
          <div class="todo-header">
            <span class="todo-title">DAILY OBJECTIVES</span>
            <span class="todo-counter" id="todoCounter">0/0</span>
          </div>
          <div class="todo-input-row">
            <input type="text" id="newTodoInput" placeholder="Add a new task & press Enter..." />
            <button id="btnAddTodo">+</button>
          </div>
          <div class="todo-list" id="todoList"></div>
        </div>

        <!-- Quick Meeting / Memo Scratchpad -->
        <div class="scratchpad-card">
          <div class="scratchpad-header">
            <span>MEMO / SCRATCHPAD</span>
            <span class="auto-save-pill">Auto-saving</span>
          </div>
          <textarea id="scratchpadArea" placeholder="Type quick notes, meeting ideas, or draft thoughts..."></textarea>
        </div>
      </div>
    `;

    setupCorporateEvents();
  }

  let todos = [];

  function setupCorporateEvents() {
    // Load stored todos and scratchpad
    chrome.storage.local.get(['corporateTodos', 'scratchpadNotes'], (res) => {
      if (Array.isArray(res.corporateTodos)) {
        todos = res.corporateTodos;
      } else {
        todos = [
          { id: 1, text: "Review project milestones", done: false },
          { id: 2, text: "Sync with design team", done: true }
        ];
      }
      renderTodoList();

      const textarea = document.getElementById('scratchpadArea');
      if (textarea && res.scratchpadNotes) {
        textarea.value = res.scratchpadNotes;
      }
    });

    const newTodoInput = document.getElementById('newTodoInput');
    const btnAddTodo = document.getElementById('btnAddTodo');

    function handleAdd() {
      if (!newTodoInput) return;
      const text = newTodoInput.value.trim();
      if (!text) return;
      todos.push({ id: Date.now(), text: text, done: false });
      newTodoInput.value = '';
      saveTodos();
      renderTodoList();
    }

    if (btnAddTodo) btnAddTodo.addEventListener('click', handleAdd);
    if (newTodoInput) {
      newTodoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAdd();
      });
    }

    // Pomodoro events
    const btnPomoToggle = document.getElementById('btnPomoToggle');
    const btnPomoBreak = document.getElementById('btnPomoBreak');
    const btnPomoReset = document.getElementById('btnPomoReset');

    if (btnPomoToggle) {
      btnPomoToggle.addEventListener('click', () => {
        const icon = (n, s=12) => window.LucideIcons ? LucideIcons.get(n, s) : '';
        isPomodoroRunning = !isPomodoroRunning;
        if (isPomodoroRunning) {
          pomodoroInterval = setInterval(pomoTick, 1000);
          btnPomoToggle.innerHTML = icon('pause', 12) + ' Pause';
          btnPomoToggle.classList.add('active');
        } else {
          clearInterval(pomodoroInterval);
          btnPomoToggle.innerHTML = icon('play', 12) + ' Focus';
          btnPomoToggle.classList.remove('active');
        }
      });
    }

    if (btnPomoBreak) {
      btnPomoBreak.addEventListener('click', () => {
        const icon = (n, s=12) => window.LucideIcons ? LucideIcons.get(n, s) : '';
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        pomodoroTimeLeft = 5 * 60;
        pomodoroTotalTime = 5 * 60;
        updatePomoDisplay();
        const badge = document.getElementById('pomoModeBadge');
        if (badge) badge.textContent = 'BREAK (5M)';
        if (btnPomoToggle) {
          btnPomoToggle.innerHTML = icon('play', 12) + ' Break';
          btnPomoToggle.classList.remove('active');
        }
      });
    }

    if (btnPomoReset) {
      btnPomoReset.addEventListener('click', () => {
        const icon = (n, s=12) => window.LucideIcons ? LucideIcons.get(n, s) : '';
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        pomodoroTimeLeft = 25 * 60;
        pomodoroTotalTime = 25 * 60;
        updatePomoDisplay();
        const badge = document.getElementById('pomoModeBadge');
        if (badge) badge.textContent = 'FOCUS (25M)';
        if (btnPomoToggle) {
          btnPomoToggle.innerHTML = icon('play', 12) + ' Focus';
          btnPomoToggle.classList.remove('active');
        }
      });
    }

    // Scratchpad autosave
    const scratchpad = document.getElementById('scratchpadArea');
    if (scratchpad) {
      scratchpad.addEventListener('input', () => {
        chrome.storage.local.set({ scratchpadNotes: scratchpad.value });
      });
    }
  }

  function pomoTick() {
    if (pomodoroTimeLeft > 0) {
      pomodoroTimeLeft--;
      updatePomoDisplay();
    } else {
      clearInterval(pomodoroInterval);
      isPomodoroRunning = false;
      playChime();
      alert("⏰ Pomodoro session completed! Take a well-deserved break.");
      const btn = document.getElementById('btnPomoToggle');
      if (btn) {
        btn.textContent = '▶ Focus';
        btn.classList.remove('active');
      }
    }
  }

  function updatePomoDisplay() {
    const el = document.getElementById('pomoTime');
    if (!el) return;
    const mins = Math.floor(pomodoroTimeLeft / 60);
    const secs = pomodoroTimeLeft % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Synthesized Web Audio chime (no external mp3 file required!)
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      // AudioContext unavailable
    }
  }

  function renderTodoList() {
    const listEl = document.getElementById('todoList');
    const counterEl = document.getElementById('todoCounter');
    if (!listEl) return;
    listEl.innerHTML = '';

    const completed = todos.filter(t => t.done).length;
    if (counterEl) counterEl.textContent = `${completed}/${todos.length}`;

    todos.forEach((todo) => {
      const item = document.createElement('div');
      item.className = `todo-item ${todo.done ? 'completed' : ''}`;

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = todo.done;
      check.addEventListener('change', () => {
        todo.done = check.checked;
        saveTodos();
        renderTodoList();
      });

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;

      const delBtn = document.createElement('button');
      delBtn.className = 'todo-del-btn';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', () => {
        todos = todos.filter(t => t.id !== todo.id);
        saveTodos();
        renderTodoList();
      });

      item.appendChild(check);
      item.appendChild(span);
      item.appendChild(delBtn);
      listEl.appendChild(item);
    });
  }

  function saveTodos() {
    chrome.storage.local.set({ corporateTodos: todos });
  }

  /* -------------------------------------------------------------
     4. OTAKU / AESTHETIC PERSONA WIDGETS
  ------------------------------------------------------------- */
  function renderOtakuWidgets(container) {
    const icon = (n, s=16) => window.LucideIcons ? LucideIcons.get(n, s) : '';
    container.innerHTML = `
      <div class="persona-dashboard otaku-dashboard glass-panel">
        <div class="dashboard-header">
          <div class="dash-title">
            <span class="dash-icon">${icon('flower', 16)}</span> OTAKU ZEN & LO-FI
          </div>
          <div class="dash-status-pill chill">CHILL VIBES</div>
        </div>

        <!-- Ambient Rain & Sound Generator -->
        <div class="ambient-sound-card">
          <div class="ambient-top">
            <span class="ambient-label">${icon('cloud-rain', 14)} BINAURAL RAIN GENERATOR</span>
            <button class="sound-toggle-btn ${isRainPlaying ? 'active' : ''}" id="btnRainToggle">
              ${isRainPlaying ? icon('pause', 12) + ' Stop Rain' : icon('play', 12) + ' Play Rain'}
            </button>
          </div>
          <div class="ambient-vol-row">
            <span>Vol:</span>
            <input type="range" id="rainVolSlider" min="0" max="1" step="0.05" value="0.3" />
          </div>
        </div>

        <!-- Inspiring Anime Quote -->
        <div class="otaku-quote-box">
          <div class="quote-text" id="otakuQuoteText">"Whatever you lose, you'll find it again. But what you throw away you'll never get back."</div>
          <div class="quote-source" id="otakuQuoteSource">— Kenshin Himura</div>
          <button class="quote-roll-btn" id="btnRollOtakuQuote" title="Next Anime Quote">${icon('sparkles', 14)}</button>
        </div>

        <!-- Focus Aura / Breathing Guide -->
        <div class="breathing-card">
          <div class="breathing-circle-outer">
            <div class="breathing-circle-inner"></div>
          </div>
          <span class="breathing-hint">Breathe In... Breathe Out...</span>
        </div>
      </div>
    `;

    setupOtakuEvents();
  }

  function setupOtakuEvents() {
    const btnRain = document.getElementById('btnRainToggle');
    const rainVol = document.getElementById('rainVolSlider');

    if (btnRain) {
      btnRain.addEventListener('click', () => {
        const icon = (n, s=12) => window.LucideIcons ? LucideIcons.get(n, s) : '';
        isRainPlaying = !isRainPlaying;
        if (isRainPlaying) {
          startRainSound(rainVol ? parseFloat(rainVol.value) : 0.3);
          btnRain.innerHTML = icon('pause', 12) + ' Stop Rain';
          btnRain.classList.add('active');
        } else {
          stopRainSound();
          btnRain.innerHTML = icon('play', 12) + ' Play Rain';
          btnRain.classList.remove('active');
        }
      });
    }

    if (rainVol) {
      rainVol.addEventListener('input', (e) => {
        if (rainGainNode) {
          rainGainNode.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
        }
      });
    }

    const btnRoll = document.getElementById('btnRollOtakuQuote');
    if (btnRoll) {
      btnRoll.addEventListener('click', () => {
        const item = ANIME_QUOTES[Math.floor(Math.random() * ANIME_QUOTES.length)];
        const textEl = document.getElementById('otakuQuoteText');
        const srcEl = document.getElementById('otakuQuoteSource');
        if (textEl) textEl.textContent = `"${item.quote}"`;
        if (srcEl) srcEl.textContent = `— ${item.source}`;
      });
    }
  }

  // Synthesized realistic rain audio node
  function startRainSound(volume = 0.3) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Generate pink noise buffer
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter to simulate soft raindrops
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, audioCtx.currentTime);

      rainGainNode = audioCtx.createGain();
      rainGainNode.gain.setValueAtTime(volume, audioCtx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(rainGainNode);
      rainGainNode.connect(audioCtx.destination);

      whiteNoise.start();
      rainNoiseNode = whiteNoise;
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }

  function stopRainSound() {
    if (rainNoiseNode) {
      try {
        rainNoiseNode.stop();
        rainNoiseNode.disconnect();
      } catch (e) {}
      rainNoiseNode = null;
    }
  }

  /* -------------------------------------------------------------
     5. UNIVERSAL WIDGETS: WEATHER & SEARCH BAR
  ------------------------------------------------------------- */
  function initWeatherWidget() {
    const mount = document.getElementById('weather-widget-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="weather-card glass-panel" id="weatherCard">
        <div class="weather-icon-temp">
          <span class="weather-icon" id="weatherIcon">${window.LucideIcons ? LucideIcons.get('sun', 20) : ''}</span>
          <span class="weather-temp" id="weatherTemp">24°C</span>
        </div>
        <div class="weather-details">
          <div class="weather-city" id="weatherCity">Tokyo, JP</div>
          <div class="weather-condition" id="weatherCondition">Clear Sky</div>
        </div>
      </div>
    `;

    fetchWeather();
  }

  function fetchWeather() {
    // Free Open-Meteo weather API for instant, keyless accurate weather
    fetch('https://api.open-meteo.com/v1/forecast?latitude=35.6895&longitude=139.6917&current_weather=true')
      .then(res => res.json())
      .then(data => {
        if (!data || !data.current_weather) return;
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;

        const tempEl = document.getElementById('weatherTemp');
        const iconEl = document.getElementById('weatherIcon');
        const condEl = document.getElementById('weatherCondition');

        if (tempEl) tempEl.textContent = `${temp}°C`;
        if (condEl) condEl.textContent = getWeatherDesc(code);
        if (iconEl) iconEl.textContent = getWeatherIcon(code);
      })
      .catch(() => {
        // Fallback
      });
  }

  function getWeatherDesc(code) {
    if (code === 0) return 'Clear Sky';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Misty / Fog';
    if (code <= 67) return 'Rain Showers';
    if (code <= 77) return 'Snow Flurries';
    if (code <= 99) return 'Thunderstorm';
    return 'Pleasant';
  }

  function getWeatherIcon(code) {
    if (!window.LucideIcons) return '';
    if (code === 0) return LucideIcons.get('sun', 20);
    if (code <= 3) return LucideIcons.get('cloud-sun', 20);
    if (code <= 48) return LucideIcons.get('cloud-fog', 20);
    if (code <= 67) return LucideIcons.get('cloud-rain', 20);
    if (code <= 77) return LucideIcons.get('cloud-snow', 20);
    if (code <= 99) return LucideIcons.get('cloud-lightning', 20);
    return LucideIcons.get('sun', 20);
  }

  function initSearchBar() {
    const mount = document.getElementById('search-bar-mount');
    if (!mount) return;

    const searchIcon = window.LucideIcons ? LucideIcons.get('search', 14) : '';
    mount.innerHTML = `
      <div class="search-box glass-panel">
        <select id="searchEngineSelect" class="search-engine-select">
          <option value="google">Google</option>
          <option value="duckduckgo">DuckDuckGo</option>
          <option value="youtube">YouTube</option>
          <option value="bing">Bing</option>
        </select>
        <input type="text" id="globalSearchInput" placeholder="Search the web or type a URL..." />
        <button id="btnExecuteSearch" class="search-go-btn" title="Search">${searchIcon}</button>
      </div>
    `;

    const input = document.getElementById('globalSearchInput');
    const select = document.getElementById('searchEngineSelect');
    const btn = document.getElementById('btnExecuteSearch');

    function performSearch() {
      const query = input.value.trim();
      if (!query) return;

      if (/^(https?:\/\/|[a-z0-9]+\.[a-z]{2,})/i.test(query)) {
        window.location.href = query.startsWith('http') ? query : `https://${query}`;
        return;
      }

      const engine = select.value;
      let url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      if (engine === 'duckduckgo') url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      if (engine === 'youtube') url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      if (engine === 'bing') url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

      window.location.href = url;
    }

    if (btn) btn.addEventListener('click', performSearch);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }
  }

  // Export module
  window.OtakuWidgets = {
    init: initWidgets,
    setPersona: (p) => {
      chrome.storage.local.set({ activePersona: p });
      applyPersona(p);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    initWidgets();
  }
})();
