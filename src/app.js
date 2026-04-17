import './styles.css';

const state = {
  activeIndex: 0,
  wallet: null,
  walletLabel: 'Not connected',
  streak: Number(localStorage.getItem('base-checkin-streak') || 0),
  lastCheckIn: Number(localStorage.getItem('base-checkin-last') || 0),
  lastTxHash: localStorage.getItem('base-last-tx-hash') || '',
  touchStartX: null,
  audioReady: false,
  game: {
    running: false,
    jumping: false,
    score: 0,
    best: Number(localStorage.getItem('mini-dino-best') || 0),
    speed: 5.2,
    obstacleX: 320,
    playerY: 0,
    velocityY: 0,
    gravity: 0.64,
    frame: null,
  }
};

const $ = (id) => document.getElementById(id);

const CONTRACT_CONFIG = {
  chainName: 'Base',
  chainIdHex: '0x2105',
  tipTargetAddress: '0x92C82520907b6Cfe61E363fe0E9f6B7c82fC7D59',
  tipAmountWeiHex: '0x1f0a7c000'
};

async function refreshOnchainUi() { return; }

async function ensureBaseNetwork() {
  if (!window.ethereum?.request) return false;
  try {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId === CONTRACT_CONFIG.chainIdHex) return true;
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONTRACT_CONFIG.chainIdHex }]
    });
    await refreshOnchainUi();
    return true;
  } catch (error) {
    console.error('switch network failed', error);
    await refreshOnchainUi();
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
  if (!window.ethereum?.request) {
    setCheckInStatus('No wallet provider detected', 'warn');
    return;
  }

  try {
    setCheckInStatus('Confirm the onchain activity in your wallet', 'idle');
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: state.wallet,
        to: CONTRACT_CONFIG.tipTargetAddress,
        value: CONTRACT_CONFIG.tipAmountWeiHex
      }]
    });
    state.lastTxHash = txHash;
    setCheckInStatus(`Onchain activity sent: ${txHash.slice(0, 10)}...`, 'success');
    applyCheckIn();
  } catch (error) {
    console.error('tip tx failed', error);
    setCheckInStatus('Transaction cancelled or failed', 'warn');
  }
}
const els = {
  track: $('track'), swipeArea: $('swipe-area'), navItems: [...document.querySelectorAll('.nav-item')],
  walletStatus: $('wallet-status'), streak: $('streak'), points: $('points'), countdown: $('countdown'),
  connectBtn: $('connect-btn'), checkinBtn: $('checkin-btn'), status: $('status'), lastActivity: $('last-activity'),
  gameScore: $('game-score'), bestScore: $('best-score'), gameStatus: $('game-status'),
  player: $('player'), obstacle: $('obstacle'), message: $('message'), game: $('game'),
  startBtn: $('start-btn'), jumpBtn: $('jump-btn'), shareBtn: $('share-btn')
};

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
function beep(frequency = 440, duration = 0.06, type = 'square', volume = 0.02) {
  try {
    const ctx = window.__audioCtx || (window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  } catch {}
}
function readyAudio() {
  if (!state.audioReady) {
    state.audioReady = true;
    beep(660, 0.01, 'sine', 0.001);
  }
}

function renderTabs() {
  els.track.style.transform = `translateX(-${state.activeIndex * 50}%)`;
  els.navItems.forEach((item) => item.classList.toggle('active', Number(item.dataset.target) === state.activeIndex));
}
function setActiveIndex(index) {
  state.activeIndex = Math.max(0, Math.min(1, index));
  renderTabs();
}
els.navItems.forEach((item) => item.addEventListener('click', () => setActiveIndex(Number(item.dataset.target))));
els.swipeArea.addEventListener('touchstart', (e) => { state.touchStartX = e.touches[0].clientX; }, { passive: true });
els.swipeArea.addEventListener('touchend', (e) => {
  if (state.touchStartX == null) return;
  const diff = e.changedTouches[0].clientX - state.touchStartX;
  if (diff < -45) setActiveIndex(state.activeIndex + 1);
  if (diff > 45) setActiveIndex(state.activeIndex - 1);
  state.touchStartX = null;
}, { passive: true });

function truncateAddress(address) {
  if (!address || typeof address !== 'string') return 'Not connected';
  if (!address.startsWith('0x') || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function renderCheckIn() {
  state.walletLabel = truncateAddress(state.wallet);
  els.walletStatus.textContent = state.walletLabel;
  els.streak.textContent = String(state.streak);
  els.lastActivity.textContent = state.lastTxHash ? `${state.lastTxHash.slice(0, 8)}...${state.lastTxHash.slice(-4)}` : 'No tip yet';
  refreshOnchainUi();
}
function setCheckInStatus(text, tone = 'idle') {
  els.status.textContent = text;
  els.status.className = `status status-${tone}`;
}

if (window.ethereum?.on) {
  window.ethereum.on('accountsChanged', (accounts) => {
    state.wallet = Array.isArray(accounts) ? (accounts[0] || null) : null;
    renderCheckIn();
    setCheckInStatus(state.wallet ? `Wallet switched: ${state.walletLabel}` : 'Wallet disconnected', state.wallet ? 'success' : 'warn');
  });
}
function persistCheckIn() {
  localStorage.setItem('base-checkin-streak', String(state.streak));
  localStorage.setItem('base-checkin-last', String(state.lastCheckIn));
  localStorage.setItem('base-last-tx-hash', state.lastTxHash || '');
}
function updateCountdown() {
  if (!state.lastCheckIn) return (els.countdown.textContent = 'Ready');
  const diff = Math.max(0, state.lastCheckIn + 86400000 - Date.now());
  if (!diff) return (els.countdown.textContent = 'Ready');
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  els.countdown.textContent = `${h}:${m}`;
}
async function connectWallet() {
  try {
    if (window.ethereum?.request) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      state.wallet = Array.isArray(accounts) ? (accounts[0] || null) : null;
    } else {
      state.wallet = '0xDEMO0000DEMO0000';
    }
    renderCheckIn();
    setCheckInStatus(state.wallet ? `Wallet connected: ${state.walletLabel}` : 'Wallet connection failed', state.wallet ? 'success' : 'warn');
    await refreshOnchainUi();
  } catch {
    setCheckInStatus('Wallet connect failed', 'warn');
    await refreshOnchainUi();
  }
}
function applyCheckIn() {
  const now = Date.now();
  const diff = now - state.lastCheckIn;
  if (state.lastCheckIn && diff < 86400000) return setCheckInStatus('Already checked in, wait for next window', 'warn');
  state.streak = !state.lastCheckIn || diff <= 172800000 ? state.streak + 1 : 1;
  state.lastCheckIn = now;
  persistCheckIn();
  renderCheckIn();
  updateCountdown();
  const today = document.getElementById('today-status');
  if (today) today.textContent = 'Done';
  setCheckInStatus('Support sent successfully.', 'success');
}
els.connectBtn.addEventListener('click', connectWallet);
els.checkinBtn.addEventListener('click', async () => {
  if (!state.wallet) return setCheckInStatus('Connect wallet first', 'warn');
  await gmOnBase();
});

function resetGameState() {
  const g = state.game;
  g.score = 0; g.speed = 5.2; g.obstacleX = 320; g.playerY = 0; g.velocityY = 0; g.jumping = false;
  els.gameScore.textContent = '0';
  els.player.style.transform = 'translateY(0px)';
  els.obstacle.style.transform = `translateX(${g.obstacleX}px)`;
  els.message.textContent = 'Tap Start';
  els.message.classList.add('show');
}
function setGameStatus(text) { els.gameStatus.textContent = text; }
function jump() {
  const g = state.game;
  readyAudio();
  if (!g.running) {
    startGame();
    return;
  }
  if (g.jumping) return;
  g.jumping = true;
  g.velocityY = 14.5;
  beep(640, 0.05, 'square', 0.025);
}
function detectCollision() {
  const g = state.game;
  const obstacleLeft = g.obstacleX;
  const obstacleRight = g.obstacleX + 22;
  const playerLeft = 34;
  const playerRight = 64;
  const playerFeet = 170 - g.playerY;
  return obstacleRight > playerLeft && obstacleLeft < playerRight && playerFeet > 142;
}
function endGame() {
  const g = state.game;
  g.running = false;
  cancelAnimationFrame(g.frame);
  if (g.score > g.best) {
    g.best = g.score;
    localStorage.setItem('mini-dino-best', String(g.best));
    els.bestScore.textContent = String(g.best);
  }
  setGameStatus('Crashed out');
  els.message.textContent = 'Game Over';
  els.message.classList.add('show');
  beep(180, 0.12, 'sawtooth', 0.03);
  vibrate([30, 30, 50]);
}
function gameLoop() {
  const g = state.game;
  if (!g.running) return;
  g.obstacleX -= g.speed;
  if (g.obstacleX < -30) {
    g.obstacleX = 340 + Math.random() * 80;
    g.score += 1;
    g.speed = Math.min(11, g.speed + 0.15);
    els.gameScore.textContent = String(g.score);
    beep(880, 0.03, 'triangle', 0.015);
  }
  if (g.jumping) {
    g.playerY += g.velocityY;
    g.velocityY -= g.gravity;
    if (g.playerY <= 0) {
      g.playerY = 0;
      g.velocityY = 0;
      g.jumping = false;
    }
  }
  els.player.style.transform = `translateY(-${g.playerY}px)`;
  els.obstacle.style.transform = `translateX(${g.obstacleX}px)`;
  if (detectCollision()) return endGame();
  g.frame = requestAnimationFrame(gameLoop);
}
function startGame() {
  readyAudio();
  resetGameState();
  state.game.running = true;
  setGameStatus('Running hot');
  els.message.textContent = '';
  els.message.classList.remove('show');
  cancelAnimationFrame(state.game.frame);
  gameLoop();
}
async function shareScore() {
  const score = state.game.best;
  const text = `I scored ${score} in Mini Dino Dash on Base 🎮`;
  const url = window.location.origin;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Mini Dino Dash', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    els.message.textContent = 'Score copied';
    els.message.classList.add('show');
    setTimeout(() => {
      if (!state.game.running) {
        els.message.textContent = 'Tap Start';
      }
    }, 1200);
  } catch {}
}
els.startBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); startGame(); });
els.jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
els.shareBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); shareScore(); });
els.game.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.code === 'ArrowUp') && state.activeIndex === 0) {
    e.preventDefault();
    jump();
  }
});

els.bestScore.textContent = String(state.game.best);
renderCheckIn();
updateCountdown();
refreshOnchainUi();
setCheckInStatus('Waiting for wallet connection');
setGameStatus('Ready');
resetGameState();
setInterval(updateCountdown, 1000);
setActiveIndex(0);
