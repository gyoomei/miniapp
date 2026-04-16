import './styles.css';

const state = {
  activeTab: 0,
  wallet: null,
  streak: Number(localStorage.getItem('base-checkin-streak') || 0),
  points: Number(localStorage.getItem('base-checkin-points') || 0),
  lastCheckIn: Number(localStorage.getItem('base-checkin-last') || 0),
  game: {
    running: false,
    jumping: false,
    score: 0,
    best: Number(localStorage.getItem('mini-dino-best') || 0),
    speed: 6,
    obstacleX: 520,
    playerY: 0,
    velocityY: 0,
    gravity: 0.9,
    frame: null,
  }
};

const els = {
  tabs: [...document.querySelectorAll('.tab')],
  track: document.getElementById('track'),
  swipeArea: document.getElementById('swipe-area'),
  walletStatus: document.getElementById('wallet-status'),
  streak: document.getElementById('streak'),
  points: document.getElementById('points'),
  countdown: document.getElementById('countdown'),
  connectBtn: document.getElementById('connect-btn'),
  checkinBtn: document.getElementById('checkin-btn'),
  status: document.getElementById('status'),
  gameScore: document.getElementById('game-score'),
  bestScore: document.getElementById('best-score'),
  gameStatus: document.getElementById('game-status'),
  player: document.getElementById('player'),
  obstacle: document.getElementById('obstacle'),
  message: document.getElementById('message'),
  game: document.getElementById('game'),
  startBtn: document.getElementById('start-btn'),
  jumpBtn: document.getElementById('jump-btn'),
  restartBtn: document.getElementById('restart-btn'),
};

function setTab(index) {
  state.activeTab = index;
  els.track.style.transform = `translateX(-${index * 100}%)`;
  els.tabs.forEach((tab, i) => tab.classList.toggle('active', i === index));
}

els.tabs.forEach((tab, index) => tab.addEventListener('click', () => setTab(index)));

let touchStartX = null;
els.swipeArea.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
els.swipeArea.addEventListener('touchend', (e) => {
  if (touchStartX == null) return;
  const diff = e.changedTouches[0].clientX - touchStartX;
  if (diff > 50 && state.activeTab > 0) setTab(state.activeTab - 1);
  if (diff < -50 && state.activeTab < 1) setTab(state.activeTab + 1);
  touchStartX = null;
}, { passive: true });

function renderCheckIn() {
  els.walletStatus.textContent = state.wallet || 'Not connected';
  els.streak.textContent = String(state.streak);
  els.points.textContent = String(state.points);
}

function setCheckInStatus(text) { els.status.textContent = text; }
function getNextResetMs() { return state.lastCheckIn ? Math.max(0, state.lastCheckIn + 86400000 - Date.now()) : 0; }
function updateCountdown() {
  const diff = getNextResetMs();
  if (!diff) return (els.countdown.textContent = 'Ready now');
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  els.countdown.textContent = `${h}:${m}:${s}`;
}
function persistCheckIn() {
  localStorage.setItem('base-checkin-streak', String(state.streak));
  localStorage.setItem('base-checkin-points', String(state.points));
  localStorage.setItem('base-checkin-last', String(state.lastCheckIn));
}
async function connectWallet() {
  try {
    if (window.ethereum?.request) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      state.wallet = accounts?.[0] || null;
      renderCheckIn();
      setCheckInStatus(state.wallet ? 'Wallet connected, ready to check in' : 'Wallet connection failed');
      return;
    }
    state.wallet = 'Demo wallet connected';
    renderCheckIn();
    setCheckInStatus('Demo mode connected, wallet SDK next');
  } catch {
    setCheckInStatus('Wallet connect failed');
  }
}
function applyCheckIn() {
  const now = Date.now();
  const diff = now - state.lastCheckIn;
  if (state.lastCheckIn && diff < 86400000) return setCheckInStatus('Already checked in, wait for next window');
  state.streak = !state.lastCheckIn || diff <= 172800000 ? state.streak + 1 : 1;
  let reward = 10;
  if (state.streak % 7 === 0) reward += 30;
  if (state.streak % 30 === 0) reward += 150;
  state.points += reward;
  state.lastCheckIn = now;
  persistCheckIn();
  renderCheckIn();
  updateCountdown();
  setCheckInStatus(`Checked in successfully, +${reward} points`);
}
els.connectBtn.addEventListener('click', connectWallet);
els.checkinBtn.addEventListener('click', () => {
  if (!state.wallet) return setCheckInStatus('Connect wallet first');
  setCheckInStatus('MVP simulation: contract call placeholder');
  setTimeout(applyCheckIn, 400);
});

function resetGame() {
  const g = state.game;
  g.score = 0; g.speed = 6; g.obstacleX = 520; g.playerY = 0; g.velocityY = 0; g.jumping = false;
  els.gameScore.textContent = '0';
  els.player.style.bottom = '18px';
  els.obstacle.style.transform = `translateX(${g.obstacleX}px)`;
}
function setGameStatus(text) { els.gameStatus.textContent = text; }
function jump() { const g = state.game; if (!g.running || g.jumping) return; g.jumping = true; g.velocityY = 14; }
function endGame() {
  const g = state.game; g.running = false; setGameStatus('Crashed'); els.message.textContent = 'Game Over'; els.message.classList.add('show');
  if (g.score > g.best) { g.best = g.score; localStorage.setItem('mini-dino-best', String(g.best)); els.bestScore.textContent = String(g.best); }
  cancelAnimationFrame(g.frame);
}
function collision() {
  const g = state.game; return g.obstacleX + 24 > 54 && g.obstacleX < 90 && (18 + g.playerY) < 58;
}
function loop() {
  const g = state.game; if (!g.running) return;
  g.obstacleX -= g.speed;
  if (g.obstacleX < -40) { g.obstacleX = 520 + Math.random() * 120; g.score += 1; g.speed = Math.min(13, g.speed + 0.18); els.gameScore.textContent = String(g.score); }
  if (g.jumping) { g.playerY += g.velocityY; g.velocityY -= g.gravity; if (g.playerY <= 0) { g.playerY = 0; g.velocityY = 0; g.jumping = false; } }
  els.obstacle.style.transform = `translateX(${g.obstacleX}px)`;
  els.player.style.bottom = `${18 + g.playerY}px`;
  if (collision()) return endGame();
  g.frame = requestAnimationFrame(loop);
}
function startGame() { resetGame(); state.game.running = true; setGameStatus('Running'); els.message.textContent = ''; els.message.classList.remove('show'); cancelAnimationFrame(state.game.frame); loop(); }
els.startBtn.addEventListener('click', startGame);
els.restartBtn.addEventListener('click', startGame);
els.jumpBtn.addEventListener('click', jump);
els.game.addEventListener('click', () => state.game.running ? jump() : startGame());
window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); state.game.running ? jump() : startGame(); } });

els.bestScore.textContent = String(state.game.best);
renderCheckIn();
updateCountdown();
setCheckInStatus('Waiting for wallet connection');
setGameStatus('Ready');
els.obstacle.style.transform = `translateX(${state.game.obstacleX}px)`;
setInterval(updateCountdown, 1000);
setTab(0);
