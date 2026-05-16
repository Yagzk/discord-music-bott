/**
 * Tek seferlik Spotify refresh_token alma scripti.
 *
 * Kullanım:
 *   1. developer.spotify.com → uygulamanın Settings → Redirect URIs kısmına
 *      "http://localhost:8888/callback" ekle ve kaydet.
 *   2. node spotify-auth.js
 *   3. Konsoldaki URL'yi tarayıcıda aç ve yetkilendir.
 *   4. Konsolda çıkan SPOTIFY_REFRESH_TOKEN değerini .env'e yapıştır.
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const { URLSearchParams } = require('url');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET .env dosyasında tanımlı olmalı.');
  process.exit(1);
}

const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
  response_type: 'code',
  client_id: CLIENT_ID,
  scope: 'user-read-private',
  redirect_uri: REDIRECT_URI,
});

console.log('\nBu URL\'yi tarayıcında aç ve Spotify hesabınla giriş yap:\n');
console.log(authUrl);
console.log('\nCallback sunucusu bekleniyor...\n');

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost:8888');
  if (reqUrl.pathname !== '/callback') { res.end(); return; }

  const code = reqUrl.searchParams.get('code');
  if (!code) {
    res.end('Hata: authorization code bulunamadı.');
    server.close();
    return;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  }).toString();

  const options = {
    hostname: 'accounts.spotify.com',
    path: '/api/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
  };

  const tokenReq = https.request(options, tokenRes => {
    let data = '';
    tokenRes.on('data', chunk => { data += chunk; });
    tokenRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.refresh_token) {
          console.log('✅ Başarılı! .env dosyasına şu satırı ekle:\n');
          console.log(`SPOTIFY_REFRESH_TOKEN=${json.refresh_token}\n`);
          res.end('<h2>Tamam! Konsolda refresh token\'ı görebilirsin. Bu pencereyi kapatabilirsin.</h2>');
        } else {
          console.error('Spotify hata döndürdü:', json);
          res.end('Hata oluştu. Konsola bak.');
        }
      } catch {
        console.error('JSON parse hatası:', data);
        res.end('Parse hatası.');
      }
      server.close();
    });
  });

  tokenReq.on('error', err => { console.error('HTTPS isteği başarısız:', err); server.close(); });
  tokenReq.write(body);
  tokenReq.end();
});

server.listen(8888);
