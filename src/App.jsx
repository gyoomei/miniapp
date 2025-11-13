import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(sdk.context.user);
    (async () => {
      await sdk.actions.ready();
    })();
  }, []);

  if (!user) {
    return <div>Mohon buka mini app di Farcaster client.</div>;
  }

  const copyFid = () => {
    navigator.clipboard.writeText(user.fid.toString());
    alert('FID disalin ke clipboard');
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20, textAlign: 'center' }}>
      <h1>Halo, {user.displayName || user.username || 'User'}</h1>
      <img
        src={user.pfpUrl}
        alt="Profile Picture"
        width={100}
        height={100}
        style={{ borderRadius: '50%', marginBottom: 10 }}
      />
      <p>FID: {user.fid}</p>
      <button onClick={copyFid} style={{ padding: '8px 20px', cursor: 'pointer' }}>
        Salin FID
      </button>
    </div>
  );
}
