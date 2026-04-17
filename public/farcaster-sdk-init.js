// Farcaster Mini App SDK initialization
// This file is loaded via CDN to ensure it runs independently of Vite bundle
import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

// Wait for window load (all resources including Vite bundle loaded)
window.addEventListener('load', async () => {
  try {
    await sdk.actions.ready();
    console.log('[Mini App] ✅ sdk.actions.ready() called successfully');
  } catch (err) {
    console.warn('[Mini App] sdk.actions.ready() failed:', err);
  }
});
