import './styles.css';

const state = {
  activeIndex: 0,
  wallet: null,
  streak: Number(localStorage.getItem('base-checkin-streak') || 0),
  points: Number(localStorage.getItem('base-checkin-points') || 0),
  lastCheckIn: Number(localStorage.getItem('base-checkin-last') || 0),
  touchStartX: null,
  game: {
    running: false,
    jumping: false,
    score: 0,
    best: Number(localStorage.getItem('mini-dino-best') || 0),
    speed: 5.5,
    obstacleX: 320,
    playerY: 0,
    velocityY: 0,
    gravity: 0.64,
    frame: null,
  }
};

const $ = (id) => document.getElementById(id);
const els = {
  track: $('track'),
  swipeArea: $('swipe-area'),
  navItems: [...document.querySelectorAll('.nav-item')],
  walletStatus: $('wallet-status'),
  streak: $('streak'),
  points: $('points'),
  countdown: $('countdown'),
  connectBtn: $('connect-btn'),
  checkinBtn: $('checkin-btn'),
  status: $('status'),
  gameScore: $('game-score'),
  bestScore: $('best-score'),
  gameStatus: $('game-status'),
  player: $('player'),
  obstacle: $('obstacle'),
  message: $('message'),
  game: $('game'),
  startBtn: $('start-btn'),
  jumpBtn: $('jump-btn'),
};

function renderTabs() {
  els.track.style.transform = `translateX(-${state.activeIndex * 50}%)`;
  els.navItems.forEach((item) => {
    item.classList.toggle('active', Number(item.dataset.target) === state.activeIndex);
  });
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

function renderCheckIn() {
  els.walletStatus.textContent = state.wallet || 'Not connected';
  els.streak.textContent = String(state.streak);
  els.points.textContent = String(state.points);
}
function setCheckInStatus(text) { els.status.textContent = text; }
function persistCheckIn() {
  localStorage.setItem('base-checkin-streak', String(state.streak));
  localStorage.setItem('base-checkin-points', String(state.points));
  localStorage.setItem('base-checkin-last', String(state.lastCheckIn));
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
      state.wallet = accounts?.[0] || null;
    } else {
      state.wallet = 'Demo wallet connected';
    }
    renderCheckIn();
    setCheckInStatus(state.wallet ? 'Wallet connected, ready to check in' : 'Wallet connection failed');
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
  setTimeout(applyCheckIn, 350);
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
  if (!g.running || g.jumping) return;
  g.jumping = true;
  g.velocityY = 14.5;
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
  setGameStatus('Crashed');
  els.message.textContent = 'Game Over';
  els.message.classList.add('show');
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
  resetGameState();
  state.game.running = true;
  setGameStatus('Running');
  els.message.textContent = '';
  els.message.classList.remove('show');
  cancelAnimationFrame(state.game.frame);
  gameLoop();
}
els.startBtn.addEventListener('click', startGame);
els.jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
els.game.addEventListener('click', () => state.game.running ? jump() : startGame());
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.code === 'ArrowUp') && state.activeIndex === 0) {
    e.preventDefault();
    state.game.running ? jump() : startGame();
  }
});

els.bestScore.textContent = String(state.game.best);
renderCheckIn();
updateCountdown();
setCheckInStatus('Waiting for wallet connection');
setGameStatus('Ready');
resetGameState();
setInterval(updateCountdown, 1000);
setActiveIndex(0);
