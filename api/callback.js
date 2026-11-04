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
  const errText = status === 'error' ? payload.error : '';
  res.send(`<!doctype html><meta charset="utf-8"><title>Logging in…</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#040A18;color:#E6EEFF;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}p{max-width:36ch}small{color:#9EAED0}</style>
<div><p id="m">Logging in…</p><small id="s"></small></div><script>
(function(){
  var origin = location.origin, msg = ${message}, err = ${JSON.stringify(errText)};
  var m = document.getElementById('m'), s = document.getElementById('s');
  if (err) { m.textContent = err; }
  if (!window.opener) {
    m.textContent = err || 'You are signed in to GitHub, but this window lost its link to the Content Manager tab.';
    s.textContent = 'Close this window, open learntryearn.vercel.app/admin directly in a normal (not private) window, turn off privacy or popup-blocking extensions for this site, and click Login with GitHub again.';
    return;
  }
  function receive(e){ if (e.origin !== origin) return; window.opener.postMessage(msg, origin); window.removeEventListener('message', receive); if (!err) setTimeout(function(){ window.close(); }, 400); }
  window.addEventListener('message', receive);
  window.opener.postMessage('authorizing:github', origin);
  setTimeout(function(){ s.textContent = 'Still here? Close this window and click Login with GitHub again. If it keeps happening, try a different browser.'; }, 6000);
})();
</script>`);
}
