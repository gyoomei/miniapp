import React, { useEffect, useState } from 'react';
import { sdk as farcasterSdk } from '@farcaster/miniapp-sdk';

export default function App() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setStatus('loading');
        const sdk = farcasterSdk ?? window.farcasterSdk ?? null;
        let u = null;
        if (sdk) {
          const tries = [
            () => sdk.auth?.getCurrentUser?.(),
            () => sdk.auth?.getViewer?.(),
            () => sdk.viewer?.getViewer?.(),
            () => sdk.getViewer?.()
          ];
          for (const fn of tries) {
            try {
              const res = await fn();
              if (res) { u = res; break; }
            } catch (e) { }
          }
        }
        if (!u) {
          try {
            const resp = await fetch('https://api.warpcast.com/v2/viewer', { credentials: 'include' });
            if (resp.ok) {
              const j = await resp.json();
              u = j.result?.viewer ?? j.viewer ?? j;
            }
          } catch (e) { }
        }
        const url = new URL(window.location.href);
        const isPreview = url.searchParams.get('preview') === 'true' || url.searchParams.get('miniapp') === 'true';
        if (!u && (!sdk || isPreview)) {
          if (!mounted) return;
          setUser({ fid: '241470', avatar: '/assets/default-avatar.png' });
          setStatus('preview');
          return;
        }
        if (!u && sdk) {
          if (!mounted) return;
          setStatus('needs-signin');
          return;
        }
        if (mounted) {
          const fid = u?.fid ?? u?.userId ?? u?.id ?? (u.result?.viewer?.fid) ?? 'unknown';
          const avatar = u?.profile?.picture ?? u?.profile?.pfp?.url ?? u?.avatar ?? '/assets/default-avatar.png';
          setUser({ fid, avatar });
          setStatus('ready');
        }
        try {
          if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
            await sdk.actions.ready();
            console.log('sdk.actions.ready() called');
          }
        } catch (e) {
          console.warn('ready() failed', e);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(String(err));
          setStatus('error');
        }
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  async function handleSignIn() {
    try {
      const sdk = farcasterSdk ?? window.farcasterSdk ?? null;
      if (!sdk || !sdk.auth || typeof sdk.auth.login !== 'function') {
        alert('Interactive sign-in not available in this environment. Open in Warpcast mobile.');
        return;
      }
      const u = await sdk.auth.login({ prompt: true });
      if (u) {
        const fid = u?.fid ?? u?.userId ?? u?.id ?? 'unknown';
        const avatar = u?.profile?.picture ?? '/assets/default-avatar.png';
        setUser({ fid, avatar });
        setStatus('ready');
        if (sdk.actions && typeof sdk.actions.ready === 'function') {
          await sdk.actions.ready();
        }
      }
    } catch (e) {
      console.error(e);
      setError(String(e));
      setStatus('error');
    }
  }

  const copyFid = async () => {
    if (!user?.fid) return;
    try {
      await navigator.clipboard.writeText(String(user.fid));
      alert('FID copied');
    } catch (e) {
      console.warn('copy failed', e);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 20, textAlign: 'center', color: '#fff', background: '#6F42C1', minHeight: '100vh' }}>
      <div style={{ maxWidth: 540, margin: '36px auto', background: 'rgba(255,255,255,0.06)', padding: 24, borderRadius: 16 }}>
        <h2>Farcaster FID Checker</h2>
        <p style={{ marginTop: 6 }}>Auto shows your Farcaster FID</p>

        <img src={user?.avatar ?? '/assets/default-avatar.png'} alt="avatar" width={120} height={120} style={{ borderRadius: 999, margin: '20px auto' }} />

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
          <pre style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>{user?.fid ?? '—'}</pre>
          <button onClick={copyFid} style={{ padding: '8px 12px', borderRadius: 8 }}>Copy</button>
        </div>

        <div style={{ marginTop: 12 }}>
          {status === 'loading' && <div>Loading…</div>}
          {status === 'preview' && <div>Preview mode — open in Warpcast to see your profile</div>}
          {status === 'needs-signin' && <div>
            <div>Not signed in — open in Warpcast or tap sign in</div>
            <button onClick={handleSignIn} style={{ marginTop: 8 }}>Sign in</button>
          </div>}
          {status === 'ready' && <div>Signed in</div>}
          {status === 'error' && <div style={{ color: 'salmon' }}>Error: {error}</div>}
        </div>
      </div>
    </div>
  );
}
