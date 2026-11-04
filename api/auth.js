// Step 1 of Decap CMS login: send the editor to GitHub to approve access.
// Needs Vercel env vars GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET (a GitHub OAuth App).
import crypto from 'node:crypto';

export default function handler(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  const host = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${host}/api/callback`);
  url.searchParams.set('scope', 'repo,user');
  url.searchParams.set('state', state);
  res.setHeader('Set-Cookie', `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.redirect(302, url.toString());
}
