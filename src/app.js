import './styles.css';

const state = {
  wallet: null,
  streak: Number(localStorage.getItem('base-checkin-streak') || 0),
  points: Number(localStorage.getItem('base-checkin-points') || 0),
  lastCheckIn: Number(localStorage.getItem('base-checkin-last') || 0),
};

const els = {
  walletStatus: document.getElementById('wallet-status'),
  streak: document.getElementById('streak'),
  points: document.getElementById('points'),
  countdown: document.getElementById('countdown'),
  connectBtn: document.getElementById('connect-btn'),
  checkinBtn: document.getElementById('checkin-btn'),
  status: document.getElementById('status'),
};

function render() {
  els.walletStatus.textContent = state.wallet || 'Not connected';
  els.streak.textContent = String(state.streak);
  els.points.textContent = String(state.points);
}

function setStatus(text) {
  els.status.textContent = text;
}

function getNextResetMs() {
  if (!state.lastCheckIn) return 0;
  return Math.max(0, state.lastCheckIn + 24 * 60 * 60 * 1000 - Date.now());
}

function updateCountdown() {
  const diff = getNextResetMs();
  if (!diff) {
    els.countdown.textContent = 'Ready now';
    return;
  }
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  els.countdown.textContent = `${h}:${m}:${s}`;
}

function persist() {
  localStorage.setItem('base-checkin-streak', String(state.streak));
  localStorage.setItem('base-checkin-points', String(state.points));
  localStorage.setItem('base-checkin-last', String(state.lastCheckIn));
}

async function connectWallet() {
  try {
    if (window.ethereum?.request) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      state.wallet = accounts?.[0] || null;
      render();
      setStatus(state.wallet ? 'Wallet connected, ready to check in' : 'Wallet connection failed');
      return;
    }
    state.wallet = 'Demo wallet connected';
    render();
    setStatus('Demo mode connected, wallet SDK next');
  } catch (error) {
    console.error(error);
    setStatus('Wallet connect failed');
  }
}

function applyCheckIn() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const diff = now - state.lastCheckIn;

  if (state.lastCheckIn && diff < day) {
    setStatus('Already checked in, wait for next window');
    return;
  }

  if (!state.lastCheckIn || diff <= day * 2) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }

  let reward = 10;
  if (state.streak % 7 === 0) reward += 30;
  if (state.streak % 30 === 0) reward += 150;

  state.points += reward;
  state.lastCheckIn = now;
  persist();
  render();
  updateCountdown();
  setStatus(`Checked in successfully, +${reward} points`);
}

els.connectBtn.addEventListener('click', connectWallet);
els.checkinBtn.addEventListener('click', () => {
  if (!state.wallet) {
    setStatus('Connect wallet first');
    return;
  }
  setStatus('MVP simulation: contract call placeholder');
  setTimeout(applyCheckIn, 500);
});

render();
updateCountdown();
setInterval(updateCountdown, 1000);
