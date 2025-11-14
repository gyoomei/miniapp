// api/frame.js - Farcaster Frame API endpoint
export async function onRequest(context) {
  try {
    const { request } = context;
    
    if (request.method === 'POST') {
      // Handle frame interaction
      const body = await request.json();
      console.log('Frame interaction:', body);
      
      return new Response(JSON.stringify({
        type: 'frame',
        frame: {
          version: 'vNext',
          image: 'https://miniapp-8oc.pages.dev/assets/social-preview.png',
          buttons: [
            {
              label: 'Open FID Checker',
              action: 'link',
              target: 'https://miniapp-8oc.pages.dev/'
            }
          ]
        }
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // For GET requests, return frame metadata
    return new Response(JSON.stringify({
      type: 'frame',
      frame: {
        version: 'vNext',
        image: 'https://miniapp-8oc.pages.dev/assets/social-preview.png',
        buttons: [
          {
            label: 'Open FID Checker',
            action: 'link',
            target: 'https://miniapp-8oc.pages.dev/'
          }
        ]
      }
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Frame API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
