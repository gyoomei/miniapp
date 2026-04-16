import './styles.css';

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best-score');
const statusEl = document.getElementById('status');
const playerEl = document.getElementById('player');
const obstacleEl = document.getElementById('obstacle');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');
const jumpBtn = document.getElementById('jump-btn');
const restartBtn = document.getElementById('restart-btn');
const gameEl = document.getElementById('game');

const state = {
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
};

bestEl.textContent = state.best;

function setStatus(text) {
  statusEl.textContent = text;
}

function resetPositions() {
  state.score = 0;
  state.speed = 6;
  state.obstacleX = 520;
  state.playerY = 0;
  state.velocityY = 0;
  state.jumping = false;
  scoreEl.textContent = '0';
  playerEl.style.bottom = '18px';
  obstacleEl.style.transform = `translateX(${state.obstacleX}px)`;
}

function jump() {
  if (!state.running || state.jumping) return;
  state.jumping = true;
  state.velocityY = 14;
}

function endGame() {
  state.running = false;
  setStatus('Crashed');
  messageEl.textContent = 'Game Over';
  messageEl.classList.add('show');
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('mini-dino-best', String(state.best));
    bestEl.textContent = String(state.best);
  }
  cancelAnimationFrame(state.frame);
}

function checkCollision() {
  const obstacleLeft = state.obstacleX;
  const obstacleRight = state.obstacleX + 24;
  const playerLeft = 54;
  const playerRight = 90;
  const playerBottom = 18 + state.playerY;
  return obstacleRight > playerLeft && obstacleLeft < playerRight && playerBottom < 58;
}

function loop() {
  if (!state.running) return;

  state.obstacleX -= state.speed;
  if (state.obstacleX < -40) {
    state.obstacleX = 520 + Math.random() * 120;
    state.score += 1;
    state.speed = Math.min(13, state.speed + 0.18);
    scoreEl.textContent = String(state.score);
  }

  if (state.jumping) {
    state.playerY += state.velocityY;
    state.velocityY -= state.gravity;
    if (state.playerY <= 0) {
      state.playerY = 0;
      state.velocityY = 0;
      state.jumping = false;
    }
  }

  obstacleEl.style.transform = `translateX(${state.obstacleX}px)`;
  playerEl.style.bottom = `${18 + state.playerY}px`;

  if (checkCollision()) {
    endGame();
    return;
  }

  state.frame = requestAnimationFrame(loop);
}

function startGame() {
  resetPositions();
  state.running = true;
  setStatus('Running');
  messageEl.textContent = '';
  messageEl.classList.remove('show');
  cancelAnimationFrame(state.frame);
  loop();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
jumpBtn.addEventListener('click', jump);
gameEl.addEventListener('click', () => {
  if (!state.running) {
    startGame();
  } else {
    jump();
  }
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    if (!state.running) startGame(); else jump();
  }
});

setStatus('Ready');
obstacleEl.style.transform = `translateX(${state.obstacleX}px)`;
