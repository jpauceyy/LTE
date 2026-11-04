// Step 2 of Decap CMS login: swap GitHub's code for a token and hand it back to the CMS window.
export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookie = /(?:^|;\s*)decap_oauth_state=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  let status = 'error', payload = { error: 'Login failed. Please close this window and try again.' };

  if (code && state && cookie === state) {
    try {
      const r = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
      });
      const data = await r.json();
      if (data.access_token) { status = 'success'; payload = { token: data.access_token, provider: 'github' }; }
      else payload = { error: data.error_description || payload.error };
    } catch { /* keep error payload */ }
  }

  const message = JSON.stringify(`authorization:github:${status}:${JSON.stringify(payload)}`);
  res.setHeader('Set-Cookie', 'decap_oauth_state=; Path=/api; Max-Age=0');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><title>Logging in…</title><p>Logging in…</p><script>
(function(){
  var origin = location.origin;
  function receive(e){ if (e.origin !== origin) return; window.opener.postMessage(${message}, origin); window.removeEventListener('message', receive); }
  window.addEventListener('message', receive);
  window.opener && window.opener.postMessage('authorizing:github', origin);
})();
</script>`);
}
