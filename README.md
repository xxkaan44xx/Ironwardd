# Discord Bot Kurulum Rehberi

## Discord Bot Token Alma

1. https://discord.com/developers/applications sayfasına gidin
2. "New Application" butonuna tıklayın
3. Botunuza bir isim verin ve "Create" butonuna tıklayın
4. Sol menüden "Bot" sekmesini seçin
5. "Reset Token" butonuna tıklayın ve token'i kopyalayın

## Token'i Ayarlama

Token'inizi environment variable olarak ayarlayın:
```bash
export DISCORD_TOKEN="YOUR_BOT_TOKEN_HERE"
```

Veya Replit Secrets kullanın:
- Sol panelden "Secrets" sekmesini açın
- Key: `DISCORD_TOKEN`
- Value: Bot token'inizi yapıştırın

## Bot İzinleri

Botunuz için gereken izinler:
- Send Messages
- Manage Messages
- Ban Members
- Kick Members
- Manage Roles
- Manage Channels
- Moderate Members
- View Channels
- Read Message History

## Mevcut Komutlar

### Admin Komutları
- `!ban @kullanıcı sebep` - Kullanıcıyı yasaklar
- `!kick @kullanıcı sebep` - Kullanıcıyı atar
- `!mute @kullanıcı süre sebep` - Kullanıcıyı susturur
- `!unmute @kullanıcı` - Kullanıcının sesini açar
- `!warn @kullanıcı sebep` - Kullanıcıya uyarı verir
- `!warnings @kullanıcı` - Uyarı geçmişini gösterir
- `!clear [sayı]` - Mesajları temizler
- `!lock [#kanal]` - Kanalı kilitler
- `!unlock [#kanal]` - Kanal kilidini açar
- `!slowmode [süre]` - Yavaş mod ayarlar
- `!nick @kullanıcı yeniisim` - Nickname değiştirir

### Rol Yönetimi
- `!roleadd @kullanıcı @rol` - Rol verir
- `!roleremove @kullanıcı @rol` - Rol alır

### Bilgi Komutları
- `!ping` - Bot gecikmesini gösterir
- `!uptime` - Çalışma süresini gösterir
- `!serverinfo` - Sunucu bilgilerini gösterir
- `!userinfo [@kullanıcı]` - Kullanıcı bilgilerini gösterir
- `!avatar [@kullanıcı]` - Avatar gösterir
- `!profil [@kullanıcı]` - Profil bilgilerini gösterir

### Eğlenceli Komutlar
- `!yazitura` - Yazı tura atar
- `!zar` - Zar atar
- `!slot` - Slot makinesi
- `!askolcer @kullanıcı` - Aşk yüzdesi ölçer
- `!fight @kullanıcı` - Dövüş oyunu
- `!meme` - Random meme atar
- `!espri` - Random espri atar

### Hatırlatıcı
- `!reminderekle [süre] [mesaj]` - Hatırlatıcı ekler

### AFK Sistemi
- `!afk [sebep]` - AFK moduna geçer

## Özellikler

✅ **Tamamlananlar:**
- Admin komutları (ban, kick, mute, warn)
- Kanal yönetimi (lock, unlock, slowmode)
- Rol yönetimi
- XP ve level sistemi
- AFK sistemi
- Hatırlatıcı sistemi
- Eğlenceli komutlar ve oyunlar
- Coin sistemi
- Hoş geldin/güle güle mesajları
- Veritabanı entegrasyonu

⏳ **Planlanmakta:**
- Müzik sistemi
- Ticket sistemi
- Log sistemi
- Anti-spam/Anti-raid
- Daha fazla oyun ve eğlence komutları
- İstatistikler ve liderlik tablosu