import './styles.css';
import { sdk } from '@farcaster/miniapp-sdk';

const state = {
  user: null,
  profile: null,
  score: null,
  readyCalled: false,
};

const els = {
  app: document.getElementById('app'),
  status: document.getElementById('status'),
  avatar: document.getElementById('avatar'),
  displayName: document.getElementById('display-name'),
  username: document.getElementById('username'),
  fid: document.getElementById('fid'),
  bio: document.getElementById('bio'),
  score: document.getElementById('score'),
  scoreLabel: document.getElementById('score-label'),
  scoreHint: document.getElementById('score-hint'),
  followers: document.getElementById('followers'),
  following: document.getElementById('following'),
  pfpButton: document.getElementById('open-profile'),
  shareButton: document.getElementById('share-miniapp'),
  refreshButton: document.getElementById('refresh-data'),
  toast: document.getElementById('toast'),
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function setStatus(text) {
  els.status.textContent = text;
}

function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function scoreTier(score) {
  if (score >= 90) return { label: 'Elite', hint: 'High trust, high reach', tone: 'elite' };
  if (score >= 75) return { label: 'Strong', hint: 'Very healthy Farcaster presence', tone: 'strong' };
  if (score >= 50) return { label: 'Growing', hint: 'Solid profile momentum', tone: 'growing' };
  return { label: 'Early', hint: 'Still building reputation', tone: 'early' };
}

async function fetchUserProfile(fid) {
  const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
    headers: {
      accept: 'application/json',
      api_key: 'NEYNAR_ONCHAIN_KIT',
    },
  });

  if (!response.ok) {
    throw new Error(`Neynar user lookup failed: ${response.status}`);
  }

  const data = await response.json();
  return data.users?.[0] ?? null;
}

async function fetchNeynarScore(fid) {
  const response = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
    headers: {
      accept: 'application/json',
      api_key: 'ECB2372A-2376-467C-8927-F03F41816C39',
    },
  });

  if (!response.ok) {
    throw new Error(`Neynar score lookup failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.user?.score ?? data?.result?.user?.score ?? null;
}

function renderProfile() {
  const user = state.profile || state.user;
  const score = state.score;

  els.displayName.textContent = user.display_name || user.displayName || user.username || 'Farcaster User';
  els.username.textContent = `@${user.username || 'unknown'}`;
  els.fid.textContent = `FID ${user.fid}`;
  els.bio.textContent = user.profile?.bio?.text || user.bio?.text || 'Open your Farcaster identity with a cleaner, richer mini app experience.';
  els.avatar.src = user.pfp_url || user.pfpUrl || 'https://placehold.co/128x128/0f172a/e2e8f0?text=FC';
  els.followers.textContent = formatNumber(user.follower_count ?? 0);
  els.following.textContent = formatNumber(user.following_count ?? 0);

  if (typeof score === 'number') {
    const rounded = Math.round(score);
    const tier = scoreTier(rounded);
    els.score.textContent = rounded;
    els.scoreLabel.textContent = tier.label;
    els.scoreHint.textContent = tier.hint;
    els.app.dataset.tone = tier.tone;
  } else {
    els.score.textContent = '--';
    els.scoreLabel.textContent = 'Unavailable';
    els.scoreHint.textContent = 'Neynar score could not be loaded right now';
    els.app.dataset.tone = 'early';
  }
}

async function shareMiniapp() {
  try {
    const shareUrl = 'https://gyoomei.github.io/miniapp';
    if (sdk.actions?.composeCast) {
      await sdk.actions.composeCast({
        text: 'Checking my Farcaster reputation with this mini app ✨',
        embeds: [shareUrl],
      });
      showToast('Share composer opened');
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    showToast('Mini app URL copied');
  } catch (error) {
    console.error(error);
    showToast('Share not available');
  }
}

async function openProfile() {
  const username = state.profile?.username || state.user?.username;
  if (!username) {
    showToast('Username not available');
    return;
  }

  const url = `https://warpcast.com/${username}`;
  try {
    if (sdk.actions?.openUrl) {
      await sdk.actions.openUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to open profile');
  }
}

async function hydrate() {
  setStatus('Loading Farcaster profile...');
  const context = await sdk.context;
  if (!context?.user?.fid) {
    throw new Error('No Farcaster user context available');
  }

  state.user = context.user;
  const fid = context.user.fid;

  const [profile, score] = await Promise.allSettled([
    fetchUserProfile(fid),
    fetchNeynarScore(fid),
  ]);

  state.profile = profile.status === 'fulfilled' && profile.value ? profile.value : context.user;
  state.score = score.status === 'fulfilled' ? score.value : null;

  renderProfile();
  setStatus('Live Neynar score loaded');
}

async function init() {
  try {
    await hydrate();
    if (!state.readyCalled) {
      await sdk.actions.ready();
      state.readyCalled = true;
    }
  } catch (error) {
    console.error(error);
    setStatus('Failed to load profile data');
    showToast('Could not load Farcaster data');
  }
}

els.refreshButton.addEventListener('click', async () => {
  els.refreshButton.disabled = true;
  setStatus('Refreshing live data...');
  try {
    await hydrate();
    showToast('Profile refreshed');
  } catch (error) {
    console.error(error);
    showToast('Refresh failed');
  } finally {
    els.refreshButton.disabled = false;
  }
});

els.shareButton.addEventListener('click', shareMiniapp);
els.pfpButton.addEventListener('click', openProfile);

init();
