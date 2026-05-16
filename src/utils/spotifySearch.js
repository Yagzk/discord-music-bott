const https = require('https');

let cachedToken = null;
let tokenExpiresAt = 0;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('JSON parse hatası')); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Spotify credentials eksik');

  const body = 'grant_type=client_credentials';
  const data = await request({
    hostname: 'accounts.spotify.com',
    path: '/api/token',
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (!data.access_token) throw new Error('Token alınamadı');

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function searchTrack(query) {
  const token = await getToken();
  const data = await request({
    hostname: 'api.spotify.com',
    path: '/v1/search?q=' + encodeURIComponent(query) + '&type=track&limit=1&market=TR',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const track = data.tracks?.items?.[0];
  if (!track) return null;

  const artistStr = track.artists.map(a => a.name).join(', ');
  return {
    title: `${track.name} — ${artistStr}`,
    artistStr,
    url: `ytsearch1:${track.name} ${artistStr}`,
    durationMs: track.duration_ms,
    thumbnail: track.album?.images?.[0]?.url ?? null,
  };
}

module.exports = { searchTrack };
