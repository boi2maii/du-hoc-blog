import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const provider = searchParams.get('provider') || 'github';

    if (!code) {
        return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    try {
        const clientId = process.env.OAUTH_CLIENT_ID;
        const clientSecret = process.env.OAUTH_CLIENT_SECRET;

        const response = await fetch(`https://github.com/login/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });

        const data = await response.json();
        const accessToken = data.access_token;

        if (!accessToken) {
            return NextResponse.json({ error: 'Failed to obtain access token from GitHub' }, { status: 400 });
        }

        // Gửi token ngược lại cho Decap CMS qua script window.opener
        const script = `
      <script>
        (function() {
          function receiveMessage(e) {
            window.opener.postMessage(
              'authorization:${provider}:success:${JSON.stringify({ token: accessToken })}',
              e.origin
            );
            window.close();
          }
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:${provider}", "*");
        })()
      </script>
    `;

        return new Response(script, {
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}