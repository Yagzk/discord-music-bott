# Discord Music Bot

YouTube ve Spotify destekli, ses filtreleri olan Discord müzik botu.

## Gereksinimler

- [Node.js](https://nodejs.org/) v16.9.0 veya üzeri
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — sisteme kurulu ve PATH'te olmalı
- [FFmpeg](https://ffmpeg.org/) — sisteme kurulu ve PATH'te olmalı (veya `ffmpeg-static` paketi otomatik kullanılır)
- Spotify API bilgileri (opsiyonel, Spotify linkleri için)

## Kurulum

```bash
# 1. Repoyu klonla
git clone https://github.com/Yagzk/discord-music-bott.git
cd discord-music-bott

# 2. Paketleri yükle
npm install

# 3. .env dosyasını oluştur
cp .env.example .env
# .env dosyasını açıp bilgilerini gir

# 4. Slash komutlarını kaydet
npm run deploy

# 5. Botu başlat
npm start
```

## Ortam Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayıp doldur:

| Değişken | Açıklama |
|---|---|
| `BOT_TOKEN` | Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications)) |
| `CLIENT_ID` | Uygulamanın client ID'si |
| `GUILD_ID` | Test sunucu ID'si (boş bırakılırsa slash komutları global olur) |
| `PREFIX` | Prefix komutlar için ön ek (varsayılan: `.`) |
| `LOG_CHANNEL_ID` | Kullanım loglarının gönderileceği kanal ID'si |
| `SPOTIFY_CLIENT_ID` | Spotify API client ID ([Spotify Dashboard](https://developer.spotify.com/dashboard)) |
| `SPOTIFY_CLIENT_SECRET` | Spotify API client secret |
| `SPOTIFY_REFRESH_TOKEN` | Spotify refresh token (`node spotify-auth.js` ile alınır) |

## Spotify Refresh Token Alma

```bash
node spotify-auth.js
```

Konsolda çıkan URL'yi tarayıcıda aç, yetkilendir ve çıkan token'ı `.env`'e yaz.

## Komutlar

Prefix komutları (varsayılan `.`) ve slash komutları (`/`) desteklenir.

| Komut | Açıklama |
|---|---|
| `play <şarkı/URL>` | YouTube veya Spotify'dan şarkı çal |
| `skip` | Şarkıyı atla |
| `stop` | Çalmayı durdur ve kanaldan çık |
| `queue` | Kuyruğu göster |
| `nowplaying` | Şu an çalınanı göster |
| `pause` / `resume` | Duraklat / Devam et |
| `loop` | Döngü modunu değiştir |
| `shuffle` | Kuyruğu karıştır |
| `bassboost` | Bass güçlendirme |
| `filter` | Ses filtreleri |
| `volume` | Ses seviyesi |
| `seek` | Belirli bir konuma atla |
| `lyrics` | Şarkı sözlerini göster |
| `history` | Çalma geçmişi |
| `favorites` | Favori şarkılar |
| `stats` | Sunucu müzik istatistikleri |
