import './styles.css';
import { sdk } from '@farcaster/miniapp-sdk';

const NEYNAR_API_KEY = 'ECB2372A-2376-467C-8927-F03F41816C39';
const state = { user: null, profile: null, score: null, readyCalled: false };
const $ = id => document.getElementById(id);
const els = {
  app: $('app'), status: $('status'), avatar: $('avatar'), displayName: $('display-name'), username: $('username'), fid: $('fid'), bio: $('bio'), score: $('score'), scoreLabel: $('score-label'), scoreHint: $('score-hint'), followers: $('followers'), following: $('following'), profileBtn: $('open-profile'), shareBtn: $('share-miniapp'), refreshBtn: $('refresh-data'), toast: $('toast')
};
function toast(message){ els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(()=>els.toast.classList.remove('show'), 2200); }
function setStatus(message){ els.status.textContent = message; }
function compact(value){ return new Intl.NumberFormat('en',{notation:'compact', maximumFractionDigits:1}).format(value ?? 0); }
function tier(score){ if(score >= 90) return ['Elite','High trust, high reach']; if(score >= 75) return ['Strong','Very healthy Farcaster presence']; if(score >= 50) return ['Growing','Solid profile momentum']; return ['Early','Still building reputation']; }
async function neynar(path){
  const res = await fetch(`https://api.neynar.com${path}`, { headers: { accept: 'application/json', api_key: NEYNAR_API_KEY } });
  if(!res.ok){ const text = await res.text(); throw new Error(`Neynar ${res.status}: ${text}`); }
  return res.json();
}
async function loadProfile(fid){
  const data = await neynar(`/v2/farcaster/user/bulk?fids=${fid}`);
  return data.users?.[0] ?? null;
}
async function loadScore(fid){
  const data = await neynar(`/v2/farcaster/user?fid=${fid}`);
  const score = data?.user?.score ?? data?.result?.user?.score ?? data?.users?.[0]?.score ?? null;
  if (typeof score !== 'number') throw new Error('Score field not found in Neynar response');
  return score;
}
function render(){
  const user = state.profile || state.user;
  if(!user) return;
  els.displayName.textContent = user.display_name || user.displayName || user.username || 'Farcaster User';
  els.username.textContent = `@${user.username || 'unknown'}`;
  els.fid.textContent = `FID ${user.fid}`;
  els.bio.textContent = user.profile?.bio?.text || user.bio?.text || 'Open your Farcaster identity with a cleaner, richer mini app experience.';
  els.avatar.src = user.pfp_url || user.pfpUrl || 'https://placehold.co/128x128/0f172a/e2e8f0?text=FC';
  els.followers.textContent = compact(user.follower_count ?? 0);
  els.following.textContent = compact(user.following_count ?? 0);
  if(typeof state.score === 'number'){
    const rounded = Math.round(state.score);
    const [label, hint] = tier(rounded);
    els.score.textContent = String(rounded);
    els.scoreLabel.textContent = label;
    els.scoreHint.textContent = hint;
  } else {
    els.score.textContent = '--';
    els.scoreLabel.textContent = 'Unavailable';
    els.scoreHint.textContent = 'Neynar score could not be loaded right now';
  }
}
async function hydrate(){
  setStatus('Loading Farcaster profile...');
  const context = await sdk.context;
  if(!context?.user?.fid) throw new Error('No Farcaster user context available');
  state.user = context.user;
  const fid = context.user.fid;
  const [profileRes, scoreRes] = await Promise.allSettled([loadProfile(fid), loadScore(fid)]);
  state.profile = profileRes.status === 'fulfilled' && profileRes.value ? profileRes.value : context.user;
  state.score = scoreRes.status === 'fulfilled' ? scoreRes.value : null;
  if (scoreRes.status !== 'fulfilled') console.error('Neynar score failed:', scoreRes.reason);
  render();
  setStatus(scoreRes.status === 'fulfilled' ? 'Live Neynar score loaded' : 'Profile loaded, score unavailable');
}
async function init(){
  try { await hydrate(); if(!state.readyCalled){ await sdk.actions.ready(); state.readyCalled = true; } }
  catch(err){ console.error(err); setStatus('Failed to load profile data'); toast('Could not load Farcaster data'); }
}
els.refreshBtn.addEventListener('click', async ()=>{ els.refreshBtn.disabled = true; try { await hydrate(); toast('Profile refreshed'); } catch(err){ console.error(err); toast('Refresh failed'); } finally { els.refreshBtn.disabled = false; } });
els.profileBtn.addEventListener('click', async ()=>{ const username = state.profile?.username || state.user?.username; if(!username) return toast('Username not available'); const url = `https://warpcast.com/${username}`; try { if(sdk.actions?.openUrl) await sdk.actions.openUrl(url); else window.open(url, '_blank', 'noopener,noreferrer'); } catch { toast('Failed to open profile'); } });
els.shareBtn.addEventListener('click', async ()=>{ const url = 'https://miniapp-j9rw.vercel.app'; try { if(sdk.actions?.composeCast){ await sdk.actions.composeCast({ text:'Checking my Farcaster reputation with this mini app ✨', embeds:[url] }); toast('Share composer opened'); } else { await navigator.clipboard.writeText(url); toast('Mini app URL copied'); } } catch { toast('Share not available'); } });
init();
