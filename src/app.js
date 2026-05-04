// Import SDK at top level - must be before any other code
import { sdk } from '@farcaster/miniapp-sdk';
import './styles.css';

// ─── Constants (extracted from magic numbers) ───
const G = {
  PLAYER_LEFT: 34, PLAYER_BOTTOM: 40,
  PLAYER_W: 38, PLAYER_H: 42,
  OBS_W: 24, OBS_H: 40,
  GROUND: 38,
  HIT_TOP: 142, HIT_BOTTOM: 170,
  HIT_LEFT: 34, HIT_RIGHT: 64,
  JUMP_VEL: 14.5, GRAVITY: 0.64,
  INIT_SPEED: 5.2, MAX_SPEED: 11, SPEED_INC: 0.15,
};

const TIP_WEI = '0x3081a263555';
const TIP_TARGET = '0x92C82520907b6Cfe61E363fe0E9f6B7c82fC7D59';
const BASE_CHAIN = '0x2105';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
const TIP_USD_RAW = 0.000001; // ETH

const storage = {
  get(key, fallback = '') {
    try {
      return window.localStorage?.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      // Storage can be unavailable in privacy-restricted webviews.
    }
  }
};

function isFarcasterClient() {
  return Boolean(
    window.parent !== window ||
    document.referrer.includes('warpcast.com') ||
    document.referrer.includes('farcaster.xyz') ||
    navigator.userAgent.includes('Farcaster') ||
    navigator.userAgent.includes('Warpcast')
  );
}

const state = {
  activeIndex: 0,
  wallet: null,
  walletLabel: 'Not connected',
  streak: Number(storage.get('base-checkin-streak', '0') || 0),
  lastCheckIn: Number(storage.get('base-checkin-last', '0') || 0),
  lastTxHash: storage.get('base-last-tx-hash', ''),
  lastTxUrl: storage.get('base-last-tx-url', ''),
  touchStartX: null,
  audioReady: false,
  theme: storage.get('miniapp-theme', 'dark'),
  ethPrice: null,       // USD per ETH
  nudgeDismissed: false,
  game: {
    running: false,
    jumping: false,
    score: 0,
    best: Number(storage.get('mini-dino-best', '0') || 0),
    speed: G.INIT_SPEED,
    obstacleX: 340,
    playerY: 0,
    velocityY: 0,
    frame: null,
  }
};

const $ = (id) => document.getElementById(id);

// ─── DOM refs ───
const els = {
  track: $('track'), swipeArea: $('swipe-area'),
  navItems: [...document.querySelectorAll('.nav-item')],
  tabGame: $('tab-game'), tabCheckin: $('tab-checkin'),
  walletStatus: $('wallet-status'), streak: $('streak'),
  fireLabel: $('fire-label'),
  points: $('points'), countdown: $('countdown'),
  connectBtn: $('connect-btn'), checkinBtn: $('checkin-btn'),
  status: $('status'), lastActivity: $('last-activity'),
  viewTxBtn: $('view-tx-btn'),
  gameScore: $('game-score'), bestScore: $('best-score'),
  gameStatus: $('game-status'), speedBar: $('speed-bar'),
  scoreCard: $('game-score')?.closest('.stat-card'),
  bestCard: $('best-score')?.closest('.stat-card'),
  player: $('player'), obstacle: $('obstacle'), obstacleWrap: $('obstacle-wrap'),
  message: $('message'), game: $('game'),
  startBtn: $('start-btn'), jumpBtn: $('jump-btn'),
  shareBtn: $('share-btn'), themeToggle: $('theme-toggle'),
  tipNote: $('tip-note'),
  todayStatus: $('today-status'),
};

// ─── Audio ───
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
function beep(frequency = 440, duration = 0.06, type = 'square', volume = 0.02) {
  try {
    const ctx = window.__audioCtx || (window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch {}
}
function readyAudio() {
  if (!state.audioReady) {
    state.audioReady = true;
    beep(660, 0.01, 'sine', 0.001);
  }
}

// ─── Theme ───
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  if (els.themeToggle) {
    els.themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    els.themeToggle.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  storage.set('miniapp-theme', state.theme);
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

// ─── Tab / Navigation ───
function renderTabs() {
  els.track.style.transform = `translateX(-${state.activeIndex * 50}%)`;
  els.navItems.forEach((item, i) => {
    const active = Number(item.dataset.target) === state.activeIndex;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  // Auto-nudge on Check-in tab
  if (state.activeIndex === 1 && !state.wallet && !state.nudgeDismissed) {
    showWalletNudge();
  }
}
function setActiveIndex(index, skipNudge = false) {
  state.activeIndex = Math.max(0, Math.min(1, index));
  renderTabs();
  if (!skipNudge) {
    if (state.activeIndex === 0) hideWalletNudge();
  }
}
els.navItems.forEach((item) => item.addEventListener('click', () => {
  setActiveIndex(Number(item.dataset.target));
}));
els.swipeArea.addEventListener('touchstart', (e) => {
  state.touchStartX = e.touches[0].clientX;
}, { passive: true });
els.swipeArea.addEventListener('touchend', (e) => {
  if (state.touchStartX == null) return;
  const diff = e.changedTouches[0].clientX - state.touchStartX;
  if (diff < -45) setActiveIndex(state.activeIndex + 1);
  if (diff > 45) setActiveIndex(state.activeIndex - 1);
  state.touchStartX = null;
}, { passive: true });

// ─── Wallet Nudge Toast ───
function showWalletNudge() {
  let nudge = document.getElementById('wallet-nudge');
  if (!nudge) {
    nudge = document.createElement('div');
    nudge.id = 'wallet-nudge';
    nudge.className = 'toast-nudge';
    nudge.textContent = '👛 Connect your wallet to start supporting on Base ⚡';
    nudge.addEventListener('click', () => {
      state.nudgeDismissed = true;
      hideWalletNudge();
      connectWallet();
    });
    document.body.appendChild(nudge);
  }
  nudge.classList.add('show');
}
function hideWalletNudge() {
  const nudge = document.getElementById('wallet-nudge');
  if (nudge) nudge.classList.remove('show');
}

// ─── ETH Price Feed ───
async function fetchEthPrice() {
  try {
    const res = await fetch(COINGECKO_API);
    const data = await res.json();
    state.ethPrice = data?.ethereum?.usd ?? null;
    updateTipNote();
  } catch {
    state.ethPrice = null;
    updateTipNote();
  }
}
function updateTipNote() {
  if (!els.tipNote) return;
  if (state.ethPrice) {
    const usd = (TIP_USD_RAW * state.ethPrice);
    els.tipNote.textContent = `≈ $${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2)} on Base + gas`;
  } else {
    els.tipNote.textContent = '≈ $0.001 on Base + gas est.';
  }
}

// ─── Address helpers ───
function truncateAddress(address) {
  if (!address || typeof address !== 'string') return 'Not connected';
  if (!address.startsWith('0x') || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Streak fire visualization ───
function updateStreakFire() {
  const s = state.streak;
  if (els.fireLabel) {
    if (s <= 0) {
      els.fireLabel.textContent = '';
      els.fireLabel.className = 'fire-label';
    } else if (s < 3) {
      els.fireLabel.textContent = '🔥';
      els.fireLabel.className = 'fire-label';
    } else if (s < 7) {
      els.fireLabel.textContent = '🔥🔥';
      els.fireLabel.className = 'fire-label lit';
    } else {
      els.fireLabel.textContent = '🔥🔥🔥';
      els.fireLabel.className = 'fire-label lit';
    }
  }
  if (els.streak) els.streak.textContent = String(s);
}

// ─── Score count-up animation ───
function pulseScoreCard() {
  if (els.scoreCard) {
    els.scoreCard.classList.remove('pulse');
    void els.scoreCard.offsetWidth;
    els.scoreCard.classList.add('pulse');
    els.scoreCard.addEventListener('animationend', () => els.scoreCard?.classList.remove('pulse'), { once: true });
  }
}
function glowBestCard() {
  if (els.bestCard) {
    els.bestCard.classList.remove('new-record');
    void els.bestCard.offsetWidth;
    els.bestCard.classList.add('new-record');
    els.bestCard.addEventListener('animationend', () => els.bestCard?.classList.remove('new-record'), { once: true });
  }
}

// ─── Score pop-up floating +1 ───
function showScorePop(x, y) {
  if (!els.game) return;
  const pop = document.createElement('div');
  pop.className = 'score-pop';
  pop.textContent = '+1';
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  els.game.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove());
}

// ─── Dust particles on landing ───
function spawnDust() {
  if (!els.game) return;
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'dust-particle';
    d.style.left = `${G.PLAYER_LEFT + Math.random() * 30}px`;
    d.style.bottom = `${G.PLAYER_BOTTOM + 8}px`;
    d.style.animationDelay = `${i * 40}ms`;
    els.game.appendChild(d);
    d.addEventListener('animationend', () => d.remove());
  }
}

// ─── Check-in / Support ───
function renderCheckIn() {
  state.walletLabel = truncateAddress(state.wallet);
  els.walletStatus.textContent = state.walletLabel;
  updateStreakFire();
  els.lastActivity.textContent = state.lastTxHash
    ? `${state.lastTxHash.slice(0, 8)}...${state.lastTxHash.slice(-4)}`
    : 'No support yet';
  if (els.viewTxBtn) els.viewTxBtn.hidden = !state.lastTxUrl;
  updateTodayStatus();
}
function updateTodayStatus() {
  if (!els.todayStatus) return;
  const now = Date.now();
  const diff = state.lastCheckIn ? now - state.lastCheckIn : Infinity;
  if (!state.lastCheckIn || diff >= 86400000) {
    els.todayStatus.textContent = '—';
  } else {
    els.todayStatus.textContent = '✓';
  }
}
function setCheckInStatus(text, tone = 'idle') {
  els.status.textContent = text;
  els.status.className = `status status-${tone}`;
}

getProvider().then(provider => {
  if (provider?.on) {
    provider.on('accountsChanged', (accounts) => {
      state.wallet = Array.isArray(accounts) ? (accounts[0] || null) : null;
      renderCheckIn();
      setCheckInStatus(
        state.wallet ? `Wallet switched: ${state.walletLabel}` : 'Wallet disconnected',
        state.wallet ? 'success' : 'warn'
      );
    });
  }
}).catch(() => {});

function persistCheckIn() {
  storage.set('base-checkin-streak', String(state.streak));
  storage.set('base-checkin-last', String(state.lastCheckIn));
  storage.set('base-last-tx-hash', state.lastTxHash || '');
  storage.set('base-last-tx-url', state.lastTxUrl || '');
}
function updateCountdown() {
  if (!state.lastCheckIn) {
    if (els.countdown) els.countdown.textContent = '—';
    return;
  }
  const diff = Math.max(0, state.lastCheckIn + 86400000 - Date.now());
  if (!diff) {
    if (els.countdown) els.countdown.textContent = 'Ready';
    return;
  }
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  if (els.countdown) els.countdown.textContent = `${h}:${m}`;
}

async function getProvider() {
  // In Farcaster Mini App, use SDK's provider
  if (isFarcasterClient() && sdk?.wallet?.getEthereumProvider) {
    try {
      const provider = await sdk.wallet.getEthereumProvider();
      if (provider?.request) return provider;
    } catch {
      // Outside Farcaster some SDK wallet calls throw internal errors.
      // Keep the standalone web fallback clean instead of surfacing noise.
    }
  }
  // Fallback to browser wallet
  if (window.ethereum?.request) {
    return window.ethereum;
  }
  return null;
}

async function connectWallet() {
  try {
    const provider = await getProvider();
    if (provider?.request) {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      state.wallet = Array.isArray(accounts) ? (accounts[0] || null) : null;
    } else {
      state.wallet = null;
      setCheckInStatus('No wallet provider found', 'warn');
      return;
    }
    renderCheckIn();
    setCheckInStatus(
      state.wallet ? `Wallet connected: ${state.walletLabel}` : 'Wallet connection failed',
      state.wallet ? 'success' : 'warn'
    );
    hideWalletNudge();
  } catch {
    setCheckInStatus('Wallet connect failed', 'warn');
  }
}

async function ensureBaseNetwork() {
  const provider = await getProvider();
  if (!provider?.request) return false;
  try {
    const currentChainId = await provider.request({ method: 'eth_chainId' });
    if (currentChainId === BASE_CHAIN) return true;
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN }]
    });
    return true;
  } catch {
    return false;
  }
}

async function gmOnBase() {
  if (!state.wallet) {
    setCheckInStatus('Connect wallet first', 'warn');
    return;
  }
  const ok = await ensureBaseNetwork();
  if (!ok) {
    setCheckInStatus('Please switch wallet to Base', 'warn');
    return;
  }
  const provider = await getProvider();
  if (!provider?.request) {
    setCheckInStatus('No wallet provider detected', 'warn');
    return;
  }

  try {
    setCheckInStatus('Confirm the onchain activity in your wallet', 'idle');
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: state.wallet,
        to: TIP_TARGET,
        value: TIP_WEI
      }]
    });
    state.lastTxHash = txHash;
    state.lastTxUrl = `https://basescan.org/tx/${txHash}`;
    setCheckInStatus(`Support sent ✓ — ${txHash.slice(0, 10)}…`, 'success');
    if (els.viewTxBtn) {
      els.viewTxBtn.hidden = false;
      els.viewTxBtn.onclick = () => window.open(state.lastTxUrl, '_blank', 'noopener,noreferrer');
    }
    applyCheckIn();
    beep(880, 0.08, 'sine', 0.03);
    vibrate([40, 30, 60]);
  } catch (error) {
    const msg = error?.message || '';
    if (msg.includes('User rejected') || msg.includes('User denied') || msg.includes('4001')) {
      setCheckInStatus('Transaction cancelled.', 'warn');
    } else {
      setCheckInStatus('Transaction failed. Please try again.', 'warn');
    }
  }
}

function applyCheckIn() {
  const now = Date.now();
  const diff = state.lastCheckIn ? now - state.lastCheckIn : Infinity;
  if (state.lastCheckIn && diff < 86400000) {
    setCheckInStatus('Already checked in — wait for next window.', 'warn');
    return;
  }
  state.streak = !state.lastCheckIn || diff <= 172800000 ? state.streak + 1 : 1;
  state.lastCheckIn = now;
  persistCheckIn();
  renderCheckIn();
  updateCountdown();
  updateTodayStatus();
  setCheckInStatus('Support sent successfully.', 'success');
}

els.connectBtn.addEventListener('click', connectWallet);
els.checkinBtn.addEventListener('click', gmOnBase);
els.themeToggle?.addEventListener('click', toggleTheme);

// ─── Onchain UI (fetch treasury balance as live stat) ───
async function refreshOnchainUi() {
  const provider = await getProvider();
  if (!provider?.request || !state.wallet) return;
  try {
    const blockNumber = await provider.request({ method: 'eth_blockNumber', params: [] });
    const balanceHex = await provider.request({
      method: 'eth_getBalance',
      params: [TIP_TARGET, blockNumber]
    });
    const balance = BigInt(balanceHex);
    const eth = Number(balance) / 1e18;
    // Could display total raised here if desired
  } catch (e) {
    // Silently fail — non-critical
  }
}

// ─── Game ───
function resetGameState() {
  const g = state.game;
  g.score = 0; g.speed = G.INIT_SPEED; g.obstacleX = 340; g.playerY = 0; g.velocityY = 0; g.jumping = false;
  els.gameScore.textContent = '0';
  els.player.style.transform = 'translateY(0px)';
  els.player.classList.remove('jumping');
  els.obstacleWrap.style.transform = `translateX(${g.obstacleX}px)`;
  els.obstacle.classList.remove('wobble');
  if (els.speedBar) els.speedBar.style.width = '0%';
  els.message.textContent = 'Tap Start';
  els.message.classList.add('show');
  els.game?.classList.remove('running');
}
function setGameStatus(text) { if (els.gameStatus) els.gameStatus.textContent = text; }

function spawnDustLanding() {
  spawnDust();
}

function jump() {
  const g = state.game;
  readyAudio();
  if (!g.running) { startGame(); return; }
  if (g.jumping) return;
  g.jumping = true;
  g.velocityY = G.JUMP_VEL;
  els.player.classList.add('jumping');
  setTimeout(() => els.player?.classList.remove('jumping'), 300);
  beep(640, 0.05, 'square', 0.025);
}

function detectCollision() {
  const g = state.game;
  const obsLeft = g.obstacleX;
  const obsRight = g.obstacleX + G.OBS_W;
  const playerBottom = G.PLAYER_BOTTOM + g.playerY;
  const playerTop = playerBottom + G.PLAYER_H;
  return (
    obsRight > G.HIT_LEFT &&
    obsLeft < G.HIT_RIGHT &&
    playerBottom < G.HIT_BOTTOM &&
    playerTop > G.HIT_TOP
  );
}

function endGame() {
  const g = state.game;
  g.running = false;
  cancelAnimationFrame(g.frame);

  // Flash effect
  const flash = document.getElementById('crash-flash');
  if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 300); }

  if (g.score > g.best) {
    g.best = g.score;
    storage.set('mini-dino-best', String(g.best));
    els.bestScore.textContent = String(g.best);
    glowBestCard();
  }
  setGameStatus('Crashed');
  els.game?.classList.remove('running');
  els.message.textContent = 'Game Over';
  els.message.classList.add('show');
  beep(180, 0.12, 'sawtooth', 0.03);
  vibrate([30, 30, 50]);
}

function gameLoop() {
  const g = state.game;
  if (!g.running) return;

  // Move obstacle
  g.obstacleX -= g.speed;
  if (g.obstacleX < -30) {
    g.obstacleX = 340 + Math.random() * 80;
    g.score += 1;
    g.speed = Math.min(G.MAX_SPEED, g.speed + G.SPEED_INC);
    const speedPct = Math.max(8, Math.min(100, ((g.speed - G.INIT_SPEED) / (G.MAX_SPEED - G.INIT_SPEED)) * 100));
    if (els.speedBar) els.speedBar.style.width = `${speedPct}%`;
    els.gameScore.textContent = String(g.score);
    pulseScoreCard();
    showScorePop(280 + Math.random() * 40, 60 + Math.random() * 20);
    beep(880, 0.03, 'triangle', 0.015);
  }

  // Jump physics
  if (g.jumping) {
    g.playerY += g.velocityY;
    g.velocityY -= G.GRAVITY;
    if (g.playerY <= 0) {
      g.playerY = 0;
      g.velocityY = 0;
      g.jumping = false;
      spawnDustLanding();
    }
  }

  els.player.style.transform = `translateY(-${g.playerY}px)`;
  els.obstacleWrap.style.transform = `translateX(${g.obstacleX}px)`;

  if (detectCollision()) { endGame(); return; }
  g.frame = requestAnimationFrame(gameLoop);
}

function startGame() {
  readyAudio();
  resetGameState();
  state.game.running = true;
  els.game?.classList.add('running');
  els.obstacle.classList.add('wobble');
  setGameStatus('Running');
  els.message.textContent = '';
  els.message.classList.remove('show');
  cancelAnimationFrame(state.game.frame);
  gameLoop();
}

// ─── Farcaster User Context ───
let fcUser = null;

async function loadFarcasterUser() {
  try {
    const context = await sdk.context;
    if (context?.user) {
      fcUser = context.user;
      console.log('[MiniDinoDash] Farcaster user:', fcUser.username);
      renderFarcasterUser();
    }
  } catch {}
}

function renderFarcasterUser() {
  if (!fcUser) return;
  // Show username in hero card
  const heroGame = document.querySelector('.hero-game h1');
  if (heroGame) {
    heroGame.textContent = `Hey ${fcUser.displayName || fcUser.username}! Ready to run?`;
  }
  // Show avatar in support tab
  const connectBtn = els.connectBtn;
  if (connectBtn && fcUser.pfpUrl && !connectBtn.querySelector('.fc-avatar')) {
    const avatar = document.createElement('img');
    avatar.src = fcUser.pfpUrl;
    avatar.className = 'fc-avatar';
    avatar.alt = fcUser.username;
    avatar.width = 24;
    avatar.height = 24;
    avatar.style.cssText = 'border-radius:50%;margin-right:6px;vertical-align:middle;width:24px;height:24px;';
    connectBtn.prepend(avatar);
  }
}

// ─── Share Score as Cast ───
async function shareScore() {
  const score = state.game.score || state.game.best;
  const username = fcUser?.username ? `@${fcUser.username}` : 'I';
  const text = `${username} scored ${score} in Mini Dino Dash 🦕⚡\n\nCan you beat me?`;
  const url = 'https://miniapp-mu-seven.vercel.app';

  const castPayload = { text, embeds: [url] };

  // Use Farcaster SDK composeCast when available. Race with a short timeout so
  // standalone browser previews never hang on Share.
  if (isFarcasterClient() && sdk?.actions?.composeCast) {
    try {
      const result = await Promise.race([
        sdk.actions.composeCast(castPayload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('compose timeout')), 1200))
      ]);
      if (result?.cast) {
        beep(880, 0.08, 'sine', 0.03);
      }
      return;
    } catch {
      // Fallback below handles non-Farcaster browsers and SDK rejection.
    }
  }

  // Fallback: clipboard + warpcast URL
  const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text + '\n' + url)}`;
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    els.message.textContent = 'Copied!';
    els.message.classList.add('show');
    setTimeout(() => {
      if (!state.game.running) {
        els.message.textContent = 'Tap Start';
        els.message.classList.add('show');
      }
    }, 1500);
  } catch {}
  try {
    if (isFarcasterClient() && sdk?.actions?.openUrl) {
      await sdk.actions.openUrl(warpcastUrl);
      return;
    }
  } catch {}
  window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
}

els.startBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); startGame(); });
els.jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
els.shareBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); shareScore(); });
els.game?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  jump();
});
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.code === 'ArrowUp') && state.activeIndex === 0) {
    e.preventDefault();
    jump();
  }
});

// ─── Init ───
els.bestScore.textContent = String(state.game.best);
applyTheme();
renderCheckIn();
updateCountdown();
fetchEthPrice();
setCheckInStatus('Waiting for wallet connection');
setGameStatus('Ready');
resetGameState();
setActiveIndex(0, true);
setInterval(updateCountdown, 1000);
setInterval(fetchEthPrice, 60_000); // refresh ETH price every minute

// Load Farcaster user context
if (isFarcasterClient()) loadFarcasterUser();

// ─── Farcaster Mini App SDK Ready ───
// CRITICAL: call ready() after first paint so the Farcaster splash never hangs.
;(async function initFarcasterSDK() {
  const markReady = async () => {
    try {
      if (sdk?.actions?.ready) {
        await sdk.actions.ready();
        console.log('[MiniDinoDash] ✅ ready() success');
      }
    } catch (error) {
      console.warn('[MiniDinoDash] ready() failed gracefully', error?.message || error);
    }
  };

  if (isFarcasterClient()) {
    requestAnimationFrame(() => { markReady(); });
  }
})();
