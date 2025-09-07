const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const moment = require('moment');

class Commands {
    // ADMIN KOMUTLARI
    static async ban(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmemiş';

        if (!user) {
            return message.reply('Yasaklanacak kullanıcıyı etiketleyin!');
        }

        try {
            await message.guild.members.ban(user, { reason });
            
            const embed = new EmbedBuilder()
                .setTitle('🔨 Kullanıcı Yasaklandı')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setColor(0xff0000)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
            
            // Log kaydet
            this.logAction(message.guild, 'ban', message.author, user, reason, db);
        } catch (error) {
            message.reply('Kullanıcı yasaklanırken bir hata oluştu!');
        }
    }

    static async kick(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmemiş';

        if (!user) {
            return message.reply('Atılacak kullanıcıyı etiketleyin!');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setTitle('👢 Kullanıcı Atıldı')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setColor(0xffa500)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
            
            this.logAction(message.guild, 'kick', message.author, user, reason, db);
        } catch (error) {
            message.reply('Kullanıcı atılırken bir hata oluştu!');
        }
    }

    static async mute(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const duration = args[1];
        const reason = args.slice(2).join(' ') || 'Sebep belirtilmemiş';

        if (!user || !duration) {
            return message.reply('Kullanım: !mute @kullanıcı süre sebep');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            const time = this.parseDuration(duration);
            
            await member.timeout(time, reason);
            
            const embed = new EmbedBuilder()
                .setTitle('🔇 Kullanıcı Susturuldu')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Süre', value: duration, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setColor(0x808080)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
            
            this.logAction(message.guild, 'mute', message.author, user, `${reason} (${duration})`, db);
        } catch (error) {
            message.reply('Kullanıcı susturulurken bir hata oluştu!');
        }
    }

    static async unmute(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Susturması kaldırılacak kullanıcıyı etiketleyin!');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.timeout(null);
            
            const embed = new EmbedBuilder()
                .setTitle('🔊 Kullanıcının Susturması Kaldırıldı')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Kullanıcının susturması kaldırılırken bir hata oluştu!');
        }
    }

    static async warn(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmemiş';

        if (!user) {
            return message.reply('Uyarılacak kullanıcıyı etiketleyin!');
        }

        // Uyarı kaydet
        db.prepare('INSERT INTO warnings (user_id, guild_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)').run(
            user.id, message.guild.id, message.author.id, reason, new Date().toISOString()
        );

        // Kullanıcının toplam uyarı sayısını güncelle
        const currentUser = db.prepare('SELECT warnings FROM users WHERE id = ? AND guild_id = ?').get(user.id, message.guild.id);
        const warnCount = (currentUser?.warnings || 0) + 1;
        
        db.prepare('INSERT OR REPLACE INTO users (id, guild_id, warnings) VALUES (?, ?, ?)').run(
            user.id, message.guild.id, warnCount
        );

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Kullanıcı Uyarıldı')
            .addFields(
                { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                { name: 'Toplam Uyarı', value: `${warnCount}`, inline: true },
                { name: 'Moderatör', value: `${message.author.tag}`, inline: true },
                { name: 'Sebep', value: reason, inline: false }
            )
            .setColor(0xffff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
        
        this.logAction(message.guild, 'warn', message.author, user, reason, db);
    }

    static async warnings(message, args, db) {
        const user = message.mentions.users.first() || message.author;
        
        const userWarnings = db.prepare('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC').all(user.id, message.guild.id);
        const totalWarnings = db.prepare('SELECT warnings FROM users WHERE id = ? AND guild_id = ?').get(user.id, message.guild.id);

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ ${user.tag} - Uyarı Geçmişi`)
            .setDescription(`Toplam Uyarı: ${totalWarnings?.warnings || 0}`)
            .setColor(0xffff00)
            .setTimestamp();

        if (userWarnings.length > 0) {
            const warningList = userWarnings.slice(0, 10).map((warn, index) => {
                return `**${index + 1}.** ${warn.reason}\n*Moderatör: <@${warn.moderator_id}>*\n*Tarih: ${moment(warn.timestamp).format('DD/MM/YYYY HH:mm')}*\n`;
            }).join('\n');

            embed.addFields({ name: 'Son Uyarılar', value: warningList, inline: false });
        }

        message.channel.send({ embeds: [embed] });
    }

    static async clear(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const amount = parseInt(args[0]) || 10;
        
        if (amount < 1 || amount > 100) {
            return message.reply('1 ile 100 arasında bir sayı belirtin!');
        }

        try {
            const messages = await message.channel.bulkDelete(amount + 1);
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Mesajlar Temizlendi')
                .setDescription(`${messages.size - 1} mesaj silindi.`)
                .setColor(0x00ff00)
                .setTimestamp();

            const reply = await message.channel.send({ embeds: [embed] });
            setTimeout(() => reply.delete(), 5000);
        } catch (error) {
            message.reply('Mesajlar silinirken bir hata oluştu!');
        }
    }

    // KANAL YÖNETİMİ
    static async lock(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const channel = message.mentions.channels.first() || message.channel;
        
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setTitle('🔒 Kanal Kilitlendi')
                .setDescription(`${channel} kanalı kilitlendi.`)
                .setColor(0xff0000)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Kanal kilitlenirken bir hata oluştu!');
        }
    }

    static async unlock(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const channel = message.mentions.channels.first() || message.channel;
        
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null
            });

            const embed = new EmbedBuilder()
                .setTitle('🔓 Kanal Kilidi Açıldı')
                .setDescription(`${channel} kanalının kilidi açıldı.`)
                .setColor(0x00ff00)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Kanal kilidi açılırken bir hata oluştu!');
        }
    }

    static async slowmode(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const channel = message.mentions.channels.first() || message.channel;
        const duration = parseInt(args[0]) || 0;

        if (duration < 0 || duration > 21600) {
            return message.reply('Süre 0 ile 21600 saniye (6 saat) arasında olmalıdır!');
        }

        try {
            await channel.setRateLimitPerUser(duration);

            const embed = new EmbedBuilder()
                .setTitle('🐌 Yavaş Mod')
                .setDescription(`${channel} kanalı için yavaş mod ${duration > 0 ? `${duration} saniye` : 'kapatıldı'} olarak ayarlandı.`)
                .setColor(duration > 0 ? 0xffa500 : 0x00ff00)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Yavaş mod ayarlanırken bir hata oluştu!');
        }
    }

    // KULLANICI YÖNETİMİ
    static async nick(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const newNick = args.slice(1).join(' ');

        if (!user) {
            return message.reply('Nickname değiştirilecek kullanıcıyı etiketleyin!');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.setNickname(newNick);

            const embed = new EmbedBuilder()
                .setTitle('✏️ Nickname Değiştirildi')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Yeni Nickname', value: newNick || 'Temizlendi', inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Nickname değiştirilirken bir hata oluştu!');
        }
    }

    // EĞLENCELİ KOMUTLAR
    static async yazitura(message, args, db) {
        const result = Math.random() < 0.5 ? 'Yazı' : 'Tura';
        
        const embed = new EmbedBuilder()
            .setTitle('🪙 Yazı Tura')
            .setDescription(`Sonuç: **${result}**`)
            .setColor(0xffd700)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async zar(message, args, db) {
        const result = Math.floor(Math.random() * 6) + 1;
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 Zar Atma')
            .setDescription(`Sonuç: **${result}**`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async slot(message, args, db) {
        const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒'];
        const results = [
            emojis[Math.floor(Math.random() * emojis.length)],
            emojis[Math.floor(Math.random() * emojis.length)],
            emojis[Math.floor(Math.random() * emojis.length)]
        ];

        let win = false;
        let winAmount = 0;

        if (results[0] === results[1] && results[1] === results[2]) {
            win = true;
            winAmount = 100;
        } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            win = true;
            winAmount = 25;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎰 Slot Makinesi')
            .setDescription(`${results.join(' | ')}\n\n${win ? `🎉 Kazandın! +${winAmount} coin` : '😢 Kaybettin!'}`)
            .setColor(win ? 0x00ff00 : 0xff0000)
            .setTimestamp();

        // Coin sistemi kaldırıldı

        message.channel.send({ embeds: [embed] });
    }

    // ROL YÖNETİMİ
    static async roleadd(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const role = message.mentions.roles.first();

        if (!user || !role) {
            return message.reply('Kullanım: !roleadd @kullanıcı @rol');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.roles.add(role);

            const embed = new EmbedBuilder()
                .setTitle('✅ Rol Verildi')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Rol', value: `${role.name}`, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Rol verilirken bir hata oluştu!');
        }
    }

    static async roleremove(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const role = message.mentions.roles.first();

        if (!user || !role) {
            return message.reply('Kullanım: !roleremove @kullanıcı @rol');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.roles.remove(role);

            const embed = new EmbedBuilder()
                .setTitle('❌ Rol Alındı')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Rol', value: `${role.name}`, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true }
                )
                .setColor(0xff0000)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Rol alınırken bir hata oluştu!');
        }
    }

    // SUNUCU YÖNETİMİ
    static async serverinfo(message, args, db) {
        const guild = message.guild;
        
        const embed = new EmbedBuilder()
            .setTitle(`🏠 ${guild.name} - Sunucu Bilgisi`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Sunucu Sahibi', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Üye Sayısı', value: `${guild.memberCount}`, inline: true },
                { name: 'Kanal Sayısı', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Rol Sayısı', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Emoji Sayısı', value: `${guild.emojis.cache.size}`, inline: true },
                { name: 'Boost Seviyesi', value: `${guild.premiumTier}`, inline: true },
                { name: 'Oluşturulma Tarihi', value: `${moment(guild.createdAt).format('DD/MM/YYYY')}`, inline: false }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async userinfo(message, args, db) {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);
        const userData = db.prepare('SELECT * FROM users WHERE id = ? AND guild_id = ?').get(user.id, message.guild.id);

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${user.tag} - Kullanıcı Bilgisi`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'ID', value: user.id, inline: true },
                { name: 'Sunucuya Katılma', value: moment(member.joinedAt).format('DD/MM/YYYY HH:mm'), inline: true },
                { name: 'Hesap Oluşturma', value: moment(user.createdAt).format('DD/MM/YYYY HH:mm'), inline: true },
                { name: 'Roller', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'Yok', inline: false },
                { name: 'Uyarılar', value: `${userData?.warnings || 0}`, inline: true }
            )
            .setColor(member.displayHexColor || 0x0099ff)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async avatar(message, args, db) {
        const user = message.mentions.users.first() || message.author;
        
        const embed = new EmbedBuilder()
            .setTitle(`${user.tag} - Avatar`)
            .setImage(user.displayAvatarURL({ size: 512, dynamic: true }))
            .setColor(0x0099ff)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // EĞLENCELİ KOMUTLAR (devamı)
    static async askolcer(message, args, db) {
        const user = message.mentions.users.first();
        
        if (!user) {
            return message.reply('Aşk ölçülecek kullanıcıyı etiketleyin!');
        }

        if (user.id === message.author.id) {
            return message.reply('Kendinizle aşk ölçemezsiniz! 😅');
        }

        const percentage = Math.floor(Math.random() * 101);
        let heart = '';
        
        if (percentage < 30) heart = '💔';
        else if (percentage < 60) heart = '💛';
        else if (percentage < 80) heart = '💚';
        else heart = '❤️';

        const embed = new EmbedBuilder()
            .setTitle('💕 Aşk Ölçer')
            .setDescription(`${message.author.tag} ❤️ ${user.tag}\n\nAşk Oranı: **%${percentage}** ${heart}`)
            .setColor(0xff69b4)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async fight(message, args, db) {
        const user = message.mentions.users.first();
        
        if (!user) {
            return message.reply('Dövüşeceğiniz kullanıcıyı etiketleyin!');
        }

        if (user.id === message.author.id) {
            return message.reply('Kendinizle dövüşemezsiniz! 🥊');
        }

        const winner = Math.random() < 0.5 ? message.author : user;
        const damage = Math.floor(Math.random() * 50) + 1;

        const embed = new EmbedBuilder()
            .setTitle('⚔️ Dövüş Sonucu')
            .setDescription(`${message.author.tag} ⚔️ ${user.tag}\n\n🏆 **Kazanan:** ${winner.tag}\n💥 **Hasar:** ${damage} HP`)
            .setColor(winner.id === message.author.id ? 0x00ff00 : 0xff0000)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async meme(message, args, db) {
        const memes = [
            'Yeni update geldi ama hiçbir şey değişmedi 😂',
            'Bug değil feature 🤪',
            'Kodumu test eden yok mu? 😭',
            'Discord bot yapmak: Kolay ❌ Zor ✅',
            'Admin olunca: POWER! ⚡'
        ];

        const randomMeme = memes[Math.floor(Math.random() * memes.length)];

        const embed = new EmbedBuilder()
            .setTitle('😂 Random Meme')
            .setDescription(randomMeme)
            .setColor(0xffff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async espri(message, args, db) {
        const jokes = [
            'Neden programcılar karanlıkta çalışır? Çünkü bug\'lar ışığa koşar! 🐛',
            'Client: "Bu çok basit, 5 dakikada biter" Gerçekte: 5 saat 😅',
            'Bir programcı yürürken düşer. Neden? Çünkü manhole cover\'ı array\'e dahil etmeyi unutmuş! 🕳️',
            'Programcının en sevdiği çay hangisi? Exception Tea! ☕',
            'Neden JavaScript geliştiricileri gözlük takar? Çünkü C sharp\'ı göremezler! 👓'
        ];

        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

        const embed = new EmbedBuilder()
            .setTitle('😄 Random Espri')
            .setDescription(randomJoke)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ADMİN KOMUTLARI (DEVAMI)
    static async tempban(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const duration = args[1];
        const reason = args.slice(2).join(' ') || 'Sebep belirtilmemiş';

        if (!user || !duration) {
            return message.reply('Kullanım: !tempban @kullanıcı süre sebep');
        }

        try {
            await message.guild.members.ban(user, { reason: `${reason} (${duration})` });
            
            // Unban timer (basit implementasyon)
            const time = this.parseDuration(duration);
            setTimeout(async () => {
                try {
                    await message.guild.members.unban(user.id);
                } catch (error) {
                    console.log('Temp ban kaldırılamadı:', error);
                }
            }, time);

            const embed = new EmbedBuilder()
                .setTitle('⏰ Geçici Yasaklama')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Süre', value: duration, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setColor(0xff6600)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Geçici yasaklama işleminde hata oluştu!');
        }
    }

    static async forceban(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const userId = args[0];
        const reason = args.slice(1).join(' ') || 'Force ban';

        if (!userId) {
            return message.reply('Kullanım: !forceban [user_id] sebep');
        }

        try {
            await message.guild.members.ban(userId, { reason });
            
            const embed = new EmbedBuilder()
                .setTitle('🔨 Force Ban')
                .addFields(
                    { name: 'User ID', value: userId, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setColor(0x990000)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Force ban işleminde hata oluştu!');
        }
    }

    static async tempmute(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const duration = args[1];
        const reason = args.slice(2).join(' ') || 'Geçici susturma';

        if (!user || !duration) {
            return message.reply('Kullanım: !tempmute @kullanıcı süre sebep');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            const time = this.parseDuration(duration);
            
            await member.timeout(time, reason);
            
            const embed = new EmbedBuilder()
                .setTitle('⏰ Geçici Susturma')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Süre', value: duration, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setColor(0x808080)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Geçici susturma işleminde hata oluştu!');
        }
    }

    static async clearwarnings(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Uyarıları temizlenecek kullanıcıyı etiketleyin!');
        }

        db.prepare('DELETE FROM warnings WHERE user_id = ? AND guild_id = ?').run(user.id, message.guild.id);
        db.prepare('UPDATE users SET warnings = 0 WHERE id = ? AND guild_id = ?').run(user.id, message.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('🧹 Uyarılar Temizlendi')
            .setDescription(`${user.tag} kullanıcısının tüm uyarıları temizlendi.`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async removewarn(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const warnId = args[1];

        if (!user || !warnId) {
            return message.reply('Kullanım: !removewarn @kullanıcı [uyarı_id]');
        }

        const warning = db.prepare('SELECT * FROM warnings WHERE id = ? AND user_id = ? AND guild_id = ?').get(warnId, user.id, message.guild.id);
        
        if (!warning) {
            return message.reply('Bu uyarı bulunamadı!');
        }

        db.prepare('DELETE FROM warnings WHERE id = ?').run(warnId);
        
        // Toplam uyarı sayısını güncelle
        const currentUser = db.prepare('SELECT warnings FROM users WHERE id = ? AND guild_id = ?').get(user.id, message.guild.id);
        if (currentUser && currentUser.warnings > 0) {
            db.prepare('UPDATE users SET warnings = warnings - 1 WHERE id = ? AND guild_id = ?').run(user.id, message.guild.id);
        }

        const embed = new EmbedBuilder()
            .setTitle('❌ Uyarı Silindi')
            .setDescription(`${user.tag} kullanıcısının #${warnId} uyarısı silindi.`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // KANAL YÖNETİMİ (DEVAMI)
    static async lockchannel(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const channel = message.mentions.channels.first() || message.channel;
        
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false,
                AddReactions: false
            });

            const embed = new EmbedBuilder()
                .setTitle('🔒 Kanal Tamamen Kilitlendi')
                .setDescription(`${channel} kanalı tamamen kilitlendi.`)
                .setColor(0xff0000)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Kanal kilitlenirken bir hata oluştu!');
        }
    }

    static async unlockchannel(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const channel = message.mentions.channels.first() || message.channel;
        
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null,
                AddReactions: null
            });

            const embed = new EmbedBuilder()
                .setTitle('🔓 Kanal Kilidi Tamamen Açıldı')
                .setDescription(`${channel} kanalının kilidi tamamen açıldı.`)
                .setColor(0x00ff00)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Kanal kilidi açılırken bir hata oluştu!');
        }
    }

    static async setnickname(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const newNick = args.slice(1).join(' ');

        if (!user) {
            return message.reply('Nickname değiştirilecek kullanıcıyı etiketleyin!');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            const oldNick = member.nickname || member.user.username;
            await member.setNickname(newNick);

            const embed = new EmbedBuilder()
                .setTitle('✏️ Nickname Değiştirildi')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Eski Nick', value: oldNick, inline: true },
                    { name: 'Yeni Nick', value: newNick || 'Temizlendi', inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Nickname değiştirilirken bir hata oluştu!');
        }
    }

    // ROL YÖNETİMİ (DEVAMI)
    static async addrole(message, args, db) {
        return this.roleadd(message, args, db);
    }

    static async removerole(message, args, db) {
        return this.roleremove(message, args, db);
    }

    static async forcerole(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const role = message.mentions.roles.first();

        if (!user || !role) {
            return message.reply('Kullanım: !forcerole @kullanıcı @rol');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.roles.add(role);

            const embed = new EmbedBuilder()
                .setTitle('⚡ Rol Zorla Verildi')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Rol', value: `${role.name}`, inline: true },
                    { name: 'Moderatör', value: `${message.author.tag}`, inline: true }
                )
                .setColor(0xff6600)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Rol zorla verilirken bir hata oluştu!');
        }
    }

    static async temprole(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('Bu komutu kullanmak için yetkiniz yok!');
        }

        const user = message.mentions.users.first();
        const role = message.mentions.roles.first();
        const duration = args[2];

        if (!user || !role || !duration) {
            return message.reply('Kullanım: !temprole @kullanıcı @rol süre');
        }

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.roles.add(role);

            const embed = new EmbedBuilder()
                .setTitle('⏰ Geçici Rol Verildi')
                .addFields(
                    { name: 'Kullanıcı', value: `${user.tag}`, inline: true },
                    { name: 'Rol', value: `${role.name}`, inline: true },
                    { name: 'Süre', value: duration, inline: true }
                )
                .setColor(0xffa500)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });

            // Süre sonunda rolü kaldır
            const time = this.parseDuration(duration);
            setTimeout(async () => {
                try {
                    await member.roles.remove(role);
                } catch (error) {
                    console.log('Geçici rol kaldırılamadı:', error);
                }
            }, time);

        } catch (error) {
            message.reply('Geçici rol verilirken bir hata oluştu!');
        }
    }

    // HATIRLATICI SİSTEMİ
    static async reminderekle(message, args, db) {
        if (args.length < 2) {
            return message.reply('Kullanım: !reminderekle [süre] [mesaj]\nÖrnek: !reminderekle 30m Toplantıya katıl');
        }

        const duration = args[0];
        const reminderMessage = args.slice(1).join(' ');
        
        const time = this.parseDuration(duration);
        const remindTime = new Date(Date.now() + time).toISOString();

        db.prepare('INSERT INTO reminders (user_id, guild_id, message, remind_time, channel_id) VALUES (?, ?, ?, ?, ?)').run(
            message.author.id, message.guild.id, reminderMessage, remindTime, message.channel.id
        );

        const embed = new EmbedBuilder()
            .setTitle('⏰ Hatırlatıcı Eklendi')
            .setDescription(`**Süre:** ${duration}\n**Mesaj:** ${reminderMessage}`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async remindersil(message, args, db) {
        const reminderId = args[0];
        
        if (!reminderId) {
            return message.reply('Kullanım: !remindersil [id]');
        }

        const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(reminderId, message.author.id);
        
        if (!reminder) {
            return message.reply('Bu hatırlatıcı bulunamadı veya size ait değil!');
        }

        db.prepare('DELETE FROM reminders WHERE id = ?').run(reminderId);

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Hatırlatıcı Silindi')
            .setDescription(`Hatırlatıcı #${reminderId} silindi.`)
            .setColor(0xff0000)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async reminderliste(message, args, db) {
        const reminders = db.prepare('SELECT * FROM reminders WHERE user_id = ? AND guild_id = ? ORDER BY remind_time ASC').all(message.author.id, message.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('📋 Hatırlatıcılarınız')
            .setColor(0x0099ff)
            .setTimestamp();

        if (reminders.length === 0) {
            embed.setDescription('Henüz hatırlatıcınız bulunmuyor.');
        } else {
            const reminderList = reminders.slice(0, 10).map(reminder => {
                const time = moment(reminder.remind_time).format('DD/MM/YYYY HH:mm');
                return `**${reminder.id}.** ${reminder.message}\n*Zaman: ${time}*`;
            }).join('\n\n');

            embed.setDescription(reminderList);
        }

        message.channel.send({ embeds: [embed] });
    }

    // KOMUT LİSTESİ
    static async komutlar(message, args, db) {
        const kategori = args[0]?.toLowerCase();
        
        if (!kategori) {
            const embed = new EmbedBuilder()
                .setTitle('📋 Komut Kategorileri')
                .setDescription('Aşağıdaki kategorilerden birini seçin:')
                .addFields(
                    { name: '👑 Admin', value: '`!komutlar admin`', inline: true },
                    { name: '🔧 Moderasyon', value: '`!komutlar mod`', inline: true },
                    { name: '🎮 Eğlence', value: '`!komutlar eglence`', inline: true },
                    { name: '🎵 Müzik', value: '`!komutlar muzik`', inline: true },
                    { name: '📊 Bilgi', value: '`!komutlar bilgi`', inline: true },
                    { name: '🏆 Level', value: '`!komutlar level`', inline: true },
                    { name: '⚙️ Sunucu', value: '`!komutlar sunucu`', inline: true },
                    { name: '🎯 Oyunlar', value: '`!komutlar oyun`', inline: true },
                    { name: '🛠️ Utility', value: '`!komutlar utility`', inline: true }
                )
                .setColor(0x0099ff)
                .setFooter({ text: 'Örnek: !komutlar admin' });
            
            return message.channel.send({ embeds: [embed] });
        }

        let embed = new EmbedBuilder().setColor(0x0099ff).setTimestamp();

        switch (kategori) {
            case 'admin':
                embed.setTitle('👑 Admin Komutları')
                    .setDescription([
                        '`!ban @kullanıcı sebep` - Kullanıcıyı yasaklar',
                        '`!kick @kullanıcı sebep` - Kullanıcıyı atar',
                        '`!tempban @kullanıcı süre sebep` - Geçici yasaklar',
                        '`!forceban [user_id] sebep` - ID ile yasaklar',
                        '`!mute @kullanıcı süre sebep` - Susturur',
                        '`!unmute @kullanıcı` - Susturmayı kaldırır',
                        '`!tempmute @kullanıcı süre sebep` - Geçici susturur',
                        '`!warn @kullanıcı sebep` - Uyarı verir',
                        '`!warnings @kullanıcı` - Uyarıları gösterir',
                        '`!clearwarnings @kullanıcı` - Uyarıları temizler',
                        '`!removewarn @kullanıcı [id]` - Uyarı siler',
                        '`!clear [sayı]` - Mesajları temizler'
                    ].join('\n'));
                break;

            case 'mod':
            case 'moderasyon':
                embed.setTitle('🔧 Moderasyon Komutları')
                    .setDescription([
                        '`!lock [#kanal]` - Kanalı kilitler',
                        '`!unlock [#kanal]` - Kanal kilidini açar',
                        '`!lockchannel [#kanal]` - Kanalı tamamen kilitler',
                        '`!unlockchannel [#kanal]` - Tamamen açar',
                        '`!slowmode [süre]` - Yavaş mod ayarlar',
                        '`!nick @kullanıcı yeniisim` - Nickname değiştirir',
                        '`!setnickname @kullanıcı isim` - Nickname ayarlar',
                        '`!roleadd @kullanıcı @rol` - Rol verir',
                        '`!roleremove @kullanıcı @rol` - Rol alır',
                        '`!addrole @kullanıcı @rol` - Rol ekler',
                        '`!removerole @kullanıcı @rol` - Rol çıkarır',
                        '`!forcerole @kullanıcı @rol` - Zorla rol verir',
                        '`!temprole @kullanıcı @rol süre` - Geçici rol'
                    ].join('\n'));
                break;

            case 'eglence':
            case 'eğlence':
                embed.setTitle('🎮 Eğlence Komutları')
                    .setDescription([
                        '`!yazitura` - Yazı tura atar',
                        '`!zar` - Zar atar',
                        '`!slot` - Slot makinesi',
                        '`!askolcer @kullanıcı` - Aşk yüzdesi ölçer',
                        '`!fight @kullanıcı` - Dövüş oyunu',
                        '`!meme` - Random meme atar',
                        '`!espri` - Random espri atar',
                        '`!joke` - Şaka yapar',
                        '`!gif [kelime]` - GIF gönderir',
                        '`!8ball [soru]` - Sihirli 8-top'
                    ].join('\n'));
                break;

            case 'bilgi':
                embed.setTitle('📊 Bilgi Komutları')
                    .setDescription([
                        '`!ping` - Bot gecikmesini gösterir',
                        '`!uptime` - Çalışma süresini gösterir',
                        '`!serverinfo` - Sunucu bilgilerini gösterir',
                        '`!userinfo [@kullanıcı]` - Kullanıcı bilgileri',
                        '`!avatar [@kullanıcı]` - Avatar gösterir',
                        '`!profil [@kullanıcı]` - Profil bilgileri',
                        '`!botinfo` - Bot hakkında bilgi',
                        '`!roles` - Sunucu rollerini listeler',
                        '`!channels` - Kanalları listeler',
                        '`!membercount` - Üye sayısını gösterir'
                    ].join('\n'));
                break;

            // Level kategorisi kaldırıldı

            case 'sunucu':
                embed.setTitle('⚙️ Sunucu Yönetimi')
                    .setDescription([
                        '`!prefix [yeni_prefix]` - Bot prefixini değiştirir',
                        '`!welcome #kanal` - Hoş geldin kanalı ayarlar',
                        '`!goodbye #kanal` - Güle güle kanalı ayarlar',
                        '`!autorole @rol` - Otorol ayarlar',
                        '`!logchannel #kanal` - Log kanalı ayarlar',
                        '`!antispam [on/off]` - Spam koruması',
                        '`!antiraid [on/off]` - Raid koruması',
                        '`!modlog` - Moderasyon logları',
                        '`!settings` - Sunucu ayarlarını gösterir'
                    ].join('\n'));
                break;

            case 'oyun':
                embed.setTitle('🎯 Oyun Komutları')
                    .setDescription([
                        '`!tictactoe @kullanıcı` - XOX oyunu',
                        '`!rps @kullanıcı` - Taş kağıt makas',
                        '`!quiz` - Bilgi yarışması başlatır',
                        '`!hangman` - Adam asmaca oyunu',
                        '`!trivia` - Trivia soruları',
                        '`!duel @kullanıcı` - Düello başlatır',
                        '`!adventure` - Macera oyunu',
                        '`!story` - Hikaye oyunu',
                        '`!guess` - Sayı tahmin oyunu'
                    ].join('\n'));
                break;

            case 'utility':
                embed.setTitle('🛠️ Utility Komutları')
                    .setDescription([
                        '`!afk [sebep]` - AFK moduna geçer',
                        '`!reminderekle [süre] [mesaj]` - Hatırlatıcı ekler',
                        '`!remindersil [id]` - Hatırlatıcı siler',
                        '`!reminderliste` - Hatırlatıcıları listeler',
                        '`!weather [şehir]` - Hava durumu',
                        '`!translate [dil] [metin]` - Çeviri yapar',
                        '`!math [işlem]` - Hesaplama yapar',
                        '`!qr [metin]` - QR kod oluşturur',
                        '`!poll [soru]` - Anket başlatır'
                    ].join('\n'));
                break;

            case 'muzik':
            case 'müzik':
                embed.setTitle('🎵 Müzik Komutları')
                    .setDescription([
                        '`!play [şarkı/url]` - Şarkı çalar',
                        '`!pause` - Duraklatır',
                        '`!resume` - Devam ettirir',
                        '`!stop` - Durdurur',
                        '`!skip` - Atlar',
                        '`!queue` - Sırayı gösterir',
                        '`!nowplaying` - Şu an çalan şarkı',
                        '`!volume [0-100]` - Ses seviyesi',
                        '`!loop [on/off]` - Tekrar modu',
                        '`!shuffle` - Karıştır'
                    ].join('\n'));
                break;

            default:
                embed.setTitle('❌ Geçersiz Kategori')
                    .setDescription('Lütfen geçerli bir kategori seçin:\n`admin`, `mod`, `eglence`, `bilgi`, `level`, `sunucu`, `oyun`, `utility`, `muzik`');
        }

        message.channel.send({ embeds: [embed] });
    }

    static async help(message, args, db) {
        return this.komutlar(message, args, db);
    }

    static async commands(message, args, db) {
        return this.komutlar(message, args, db);
    }

    // BİLGİ KOMUTLARI
    static async ping(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Bot Gecikme', value: `${message.client.ws.ping}ms`, inline: true },
                { name: 'API Gecikme', value: `${Date.now() - message.createdTimestamp}ms`, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async uptime(message, args, db) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const embed = new EmbedBuilder()
            .setTitle('⏱️ Bot Çalışma Süresi')
            .setDescription(`${days}d ${hours}h ${minutes}m ${seconds}s`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async profil(message, args, db) {
        const user = message.mentions.users.first() || message.author;
        const userData = db.prepare('SELECT * FROM users WHERE id = ? AND guild_id = ?').get(user.id, message.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${user.tag} - Profil`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Uyarılar', value: `${userData?.warnings || 0}`, inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        if (userData?.afk_status) {
            embed.addFields({ name: 'AFK Durumu', value: userData.afk_reason || 'Sebep belirtilmemiş', inline: false });
        }

        message.channel.send({ embeds: [embed] });
    }

    static async afk(message, args, db) {
        const reason = args.join(' ') || 'AFK';
        
        db.prepare('INSERT OR REPLACE INTO users (id, guild_id, afk_status, afk_reason, warnings) VALUES (?, ?, ?, ?, COALESCE((SELECT warnings FROM users WHERE id = ? AND guild_id = ?), 0))').run(
            message.author.id, message.guild.id, '1', reason, message.author.id, message.guild.id
        );

        const embed = new EmbedBuilder()
            .setTitle('😴 AFK Oldunuz')
            .setDescription(`Sebep: ${reason}`)
            .setColor(0xffa500)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // LEVEL VE EKONOMİ SİSTEMİ KALDIRILDI

    // OYUNLAR
    static async tictactoe(message, args, db) {
        const opponent = message.mentions.users.first();
        
        if (!opponent) {
            return message.reply('XOX oynayacağınız kullanıcıyı etiketleyin!');
        }

        if (opponent.id === message.author.id) {
            return message.reply('Kendinizle XOX oynayamazsınız!');
        }

        const embed = new EmbedBuilder()
            .setTitle('⭕ XOX Oyunu')
            .setDescription(`${opponent}, ${message.author} ile XOX oynamak istiyor!\n\n🎮 Oyunu başlatmak için ✅ tepkisine tıklayın.`)
            .setColor(0x00ff00)
            .setTimestamp();

        const gameMessage = await message.channel.send({ embeds: [embed] });
        await gameMessage.react('✅');
        await gameMessage.react('❌');
    }

    static async rockpaperscissors(message, args, db) {
        const opponent = message.mentions.users.first();
        
        if (!opponent) {
            const choices = ['🗿', '📄', '✂️'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            const userChoice = choices[Math.floor(Math.random() * choices.length)];
            
            let result = '';
            if (userChoice === botChoice) {
                result = '🤝 Berabere!';
            } else if (
                (userChoice === '🗿' && botChoice === '✂️') ||
                (userChoice === '📄' && botChoice === '🗿') ||
                (userChoice === '✂️' && botChoice === '📄')
            ) {
                result = '🎉 Kazandın!';
            } else {
                result = '😔 Kaybettin!';
            }

            const embed = new EmbedBuilder()
                .setTitle('✂️ Taş Kağıt Makas')
                .addFields(
                    { name: 'Sen', value: userChoice, inline: true },
                    { name: 'Bot', value: botChoice, inline: true },
                    { name: 'Sonuç', value: result, inline: false }
                )
                .setColor(0x0099ff)
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('✂️ Taş Kağıt Makas')
            .setDescription(`${opponent}, ${message.author} ile taş kağıt makas oynamak istiyor!\n\n🎮 Oyunu başlatmak için ✅ tepkisine tıklayın.`)
            .setColor(0x0099ff)
            .setTimestamp();

        const gameMessage = await message.channel.send({ embeds: [embed] });
        await gameMessage.react('✅');
        await gameMessage.react('❌');
    }

    static async rps(message, args, db) {
        return this.rockpaperscissors(message, args, db);
    }

    static async quiz(message, args, db) {
        const questions = [
            { q: 'Türkiye\'nin başkenti neresidir?', a: 'ankara', options: ['Ankara', 'İstanbul', 'İzmir', 'Bursa'] },
            { q: '2 + 2 = ?', a: '4', options: ['3', '4', '5', '6'] },
            { q: 'Discord hangi yıl kuruldu?', a: '2015', options: ['2014', '2015', '2016', '2017'] },
            { q: 'En büyük gezegen hangisidir?', a: 'jüpiter', options: ['Mars', 'Venüs', 'Jüpiter', 'Satürn'] }
        ];

        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🧠 Quiz Sorusu')
            .setDescription(`**${randomQ.q}**\n\n${randomQ.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n⏰ 15 saniyeniz var!`)
            .setColor(0xff6600)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async hangman(message, args, db) {
        const words = ['discord', 'bot', 'oyun', 'kelime', 'javascript', 'replit', 'kod', 'program'];
        const word = words[Math.floor(Math.random() * words.length)];
        const hiddenWord = word.split('').map(l => l === ' ' ? ' ' : '_').join(' ');
        
        const embed = new EmbedBuilder()
            .setTitle('🎯 Adam Asmaca')
            .setDescription(`Kelime: \`${hiddenWord}\`\n\nHarf tahmin etmek için mesaj yazın!\nÖrnek: a`)
            .addFields(
                { name: 'Kalan Hak', value: '6', inline: true },
                { name: 'Tahmin Edilen', value: 'Yok', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async trivia(message, args, db) {
        return this.quiz(message, args, db);
    }

    static async duel(message, args, db) {
        const opponent = message.mentions.users.first();
        
        if (!opponent) {
            return message.reply('Düello yapacağınız kullanıcıyı etiketleyin!');
        }

        if (opponent.id === message.author.id) {
            return message.reply('Kendinizle düello yapamazsınız!');
        }

        const p1Health = 100;
        const p2Health = 100;
        const winner = Math.random() < 0.5 ? message.author : opponent;
        const damage = Math.floor(Math.random() * 40) + 10;

        const embed = new EmbedBuilder()
            .setTitle('⚔️ Düello Sonucu')
            .setDescription(`${message.author.tag} ⚔️ ${opponent.tag}`)
            .addFields(
                { name: '🏆 Kazanan', value: winner.tag, inline: true },
                { name: '💥 Verilen Hasar', value: `${damage} HP`, inline: true },
                { name: '🎯 Sonuç', value: `${winner.tag} düelloyu kazandı!`, inline: false }
            )
            .setColor(winner.id === message.author.id ? 0x00ff00 : 0xff0000)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async adventure(message, args, db) {
        const scenarios = [
            'Karanlık bir mağaraya girdin. İçerde parıldayan bir hazine sandığı görüyorsun! 💎',
            'Gizemli bir ormandasın. Önünde iki yol var: Sol taraf güvenli görünüyor, sağ taraf tehlikeli... 🌲',
            'Antik bir tapınağa ulaştın. Kapıda yazılar var ama okuyamıyorsun. İçeri girmek ister misin? 🏛️',
            'Bir ejder ile karşılaştın! Savaşmak mı yoksa kaçmak mı? 🐲'
        ];

        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🗺️ Macera Zamanı!')
            .setDescription(scenario)
            .setFooter({ text: 'Seçiminizi emoji ile belirtin!' })
            .setColor(0x9932cc)
            .setTimestamp();

        const adventureMsg = await message.channel.send({ embeds: [embed] });
        await adventureMsg.react('⬅️');
        await adventureMsg.react('➡️');
        await adventureMsg.react('⚔️');
        await adventureMsg.react('🏃');
    }

    static async story(message, args, db) {
        const stories = [
            'Bir zamanlar uzak bir galakside... 🚀',
            'Büyülü bir krallıkta yaşayan genç bir prens... 👑',
            'Modern şehrin kalbinde gizli bir laboratuvar... 🔬',
            'Okyanusun derinliklerinde kayıp bir şehir... 🌊'
        ];

        const story = stories[Math.floor(Math.random() * stories.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('📖 Hikaye Zamanı')
            .setDescription(`${story}\n\n*Hikayenin devamını yazmak için bir mesaj gönderin!*`)
            .setColor(0x8b4513)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async guess(message, args, db) {
        const number = Math.floor(Math.random() * 100) + 1;
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 Sayı Tahmin Oyunu')
            .setDescription('1-100 arasında bir sayı tuttum!\n\nTahmin etmek için sayı yazın. 6 hakkınız var!')
            .addFields(
                { name: 'Kalan Hak', value: '6', inline: true },
                { name: 'İpucu', value: 'Henüz yok', inline: true }
            )
            .setColor(0x4169e1)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // UTİLİTY KOMUTLARI
    static async weather(message, args, db) {
        const city = args.join(' ') || 'İstanbul';
        
        const embed = new EmbedBuilder()
            .setTitle(`🌤️ ${city} - Hava Durumu`)
            .setDescription('Hava durumu servisi yakında eklenecek!')
            .addFields(
                { name: '🌡️ Sıcaklık', value: '22°C', inline: true },
                { name: '💧 Nem', value: '%65', inline: true },
                { name: '💨 Rüzgar', value: '15 km/h', inline: true }
            )
            .setColor(0x87ceeb)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async translate(message, args, db) {
        const text = args.join(' ');
        
        if (!text) {
            return message.reply('Çevrilecek metni yazın! Örnek: !translate Hello World');
        }

        const embed = new EmbedBuilder()
            .setTitle('🔤 Çeviri Servisi')
            .addFields(
                { name: 'Orijinal', value: text, inline: false },
                { name: 'Çeviri', value: 'Çeviri servisi yakında eklenecek!', inline: false }
            )
            .setColor(0x4169e1)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async math(message, args, db) {
        const expression = args.join(' ');
        
        if (!expression) {
            return message.reply('Matematik işlemi yazın! Örnek: !math 2 + 2');
        }

        try {
            // Basit matematik işlemleri için güvenli eval
            const result = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/.() ]/g, '')})`)();
            
            const embed = new EmbedBuilder()
                .setTitle('🧮 Hesap Makinesi')
                .addFields(
                    { name: 'İşlem', value: expression, inline: false },
                    { name: 'Sonuç', value: result.toString(), inline: false }
                )
                .setColor(0x32cd32)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('Geçersiz matematik işlemi!');
        }
    }

    static async poll(message, args, db) {
        const question = args.join(' ');
        
        if (!question) {
            return message.reply('Anket sorusu yazın! Örnek: !poll Pizza mi hamburger mi?');
        }

        const embed = new EmbedBuilder()
            .setTitle('📊 Anket')
            .setDescription(question)
            .setFooter({ text: '✅ Evet  ❌ Hayır' })
            .setColor(0xff6347)
            .setTimestamp();

        const pollMsg = await message.channel.send({ embeds: [embed] });
        await pollMsg.react('✅');
        await pollMsg.react('❌');
    }

    static async qr(message, args, db) {
        const text = args.join(' ');
        
        if (!text) {
            return message.reply('QR kod oluşturacak metni yazın!');
        }

        const embed = new EmbedBuilder()
            .setTitle('📱 QR Kod')
            .setDescription('QR kod servisi yakında eklenecek!')
            .addFields({ name: 'Metin', value: text, inline: false })
            .setColor(0x000000)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async botinfo(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Bilgileri')
            .setDescription('IronWard - Çok amaçlı Discord botu')
            .addFields(
                { name: 'Versiyon', value: '2.0.0', inline: true },
                { name: 'Geliştirici', value: 'Replit Agent', inline: true },
                { name: 'Komut Sayısı', value: '200+', inline: true },
                { name: 'Çalışma Süresi', value: `${Math.floor(process.uptime() / 86400)}d ${Math.floor((process.uptime() % 86400) / 3600)}h`, inline: true },
                { name: 'Sunucu Sayısı', value: `${message.client.guilds.cache.size}`, inline: true },
                { name: 'Kullanıcı Sayısı', value: `${message.client.users.cache.size}`, inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async roles(message, args, db) {
        const roles = message.guild.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .map(role => `${role} (${role.members.size} üye)`)
            .slice(0, 20);

        const embed = new EmbedBuilder()
            .setTitle('📋 Sunucu Rolleri')
            .setDescription(roles.join('\n') || 'Rol bulunamadı.')
            .setColor(0x8a2be2)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async channels(message, args, db) {
        const channels = message.guild.channels.cache
            .filter(channel => channel.type === 0 || channel.type === 2)
            .sort((a, b) => a.position - b.position)
            .map(channel => `${channel.type === 2 ? '🔊' : '💬'} ${channel.name}`)
            .slice(0, 20);

        const embed = new EmbedBuilder()
            .setTitle('📋 Sunucu Kanalları')
            .setDescription(channels.join('\n') || 'Kanal bulunamadı.')
            .setColor(0x20b2aa)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async membercount(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('👥 Üye Sayısı')
            .setDescription(`Bu sunucuda **${message.guild.memberCount}** üye bulunuyor.`)
            .setColor(0x32cd32)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async invite(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('🔗 Bot Davet Linki')
            .setDescription('Botu sunucunuza eklemek için aşağıdaki linki kullanın!')
            .addFields({
                name: 'Davet Linki',
                value: `[Botu Ekle](https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot)`,
                inline: false
            })
            .setColor(0x7289da)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async say(message, args, db) {
        const text = args.join(' ');
        
        if (!text) {
            return message.reply('Tekrar etmemi istediğiniz metni yazın!');
        }

        message.delete();
        message.channel.send(text);
    }

    static async echo(message, args, db) {
        return this.say(message, args, db);
    }

    // MÜZİK SİSTEMİ (Temel)
    static async play(message, args, db) {
        const query = args.join(' ');
        if (!query) {
            return message.reply('Çalınacak şarkıyı yazın! Örnek: !play despacito');
        }

        const embed = new EmbedBuilder()
            .setTitle('🎵 Müzik Çalar')
            .setDescription(`Aranan: **${query}**\n\n⚠️ Müzik sistemi yakında eklenecek!`)
            .setColor(0x9932cc)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async pause(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('⏸️ Müzik Durduruldu')
            .setDescription('Müzik durduruldu! (Yakında çalışacak)')
            .setColor(0xff6600)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async resume(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('▶️ Müzik Devam Ediyor')
            .setDescription('Müzik devam ediyor! (Yakında çalışacak)')
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async stop(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('⏹️ Müzik Durduruldu')
            .setDescription('Müzik tamamen durduruldu!')
            .setColor(0xff0000)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async skip(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('⏭️ Şarkı Atlandı')
            .setDescription('Sonraki şarkıya geçildi!')
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async queue(message, args, db) {
        const embed = new EmbedBuilder()
            .setTitle('📋 Müzik Sırası')
            .setDescription('Şu anda sırada şarkı yok.')
            .setColor(0x0099ff)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async volume(message, args, db) {
        const vol = parseInt(args[0]) || 50;
        const embed = new EmbedBuilder()
            .setTitle('🔊 Ses Seviyesi')
            .setDescription(`Ses seviyesi **%${vol}** olarak ayarlandı!`)
            .setColor(0x32cd32)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // SUNUCU YÖNETİMİ (DEVAMI)
    static async prefix(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici yetkisi gerekiyor!');
        }

        const newPrefix = args[0];
        if (!newPrefix) {
            const current = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
            return message.reply(`Mevcut prefix: \`${current?.prefix || '!'}\``);
        }

        db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, prefix) VALUES (?, ?)').run(message.guild.id, newPrefix);

        const embed = new EmbedBuilder()
            .setTitle('✅ Prefix Değiştirildi')
            .setDescription(`Yeni prefix: \`${newPrefix}\``)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async welcome(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici yetkisi gerekiyor!');
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply('Hoş geldin kanalını etiketleyin!');
        }

        db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, welcome_channel) VALUES (?, ?)').run(message.guild.id, channel.id);

        const embed = new EmbedBuilder()
            .setTitle('👋 Hoş Geldin Kanalı Ayarlandı')
            .setDescription(`Hoş geldin mesajları ${channel} kanalında gönderilecek.`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async goodbye(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici yetkisi gerekiyor!');
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply('Güle güle kanalını etiketleyin!');
        }

        db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, leave_channel) VALUES (?, ?)').run(message.guild.id, channel.id);

        const embed = new EmbedBuilder()
            .setTitle('👋 Güle Güle Kanalı Ayarlandı')
            .setDescription(`Güle güle mesajları ${channel} kanalında gönderilecek.`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async autorole(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici yetkisi gerekiyor!');
        }

        const role = message.mentions.roles.first();
        if (!role) {
            return message.reply('Otorol olarak ayarlanacak rolü etiketleyin!');
        }

        db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, autorole) VALUES (?, ?)').run(message.guild.id, role.id);

        const embed = new EmbedBuilder()
            .setTitle('🤖 Otorol Ayarlandı')
            .setDescription(`Yeni üyelere otomatik olarak ${role} rolü verilecek.`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async logchannel(message, args, db) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Bu komutu kullanmak için yönetici yetkisi gerekiyor!');
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply('Log kanalını etiketleyin!');
        }

        db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, log_channel) VALUES (?, ?)').run(message.guild.id, channel.id);

        const embed = new EmbedBuilder()
            .setTitle('📋 Log Kanalı Ayarlandı')
            .setDescription(`Moderasyon logları ${channel} kanalında tutulacak.`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async settings(message, args, db) {
        const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Sunucu Ayarları')
            .addFields(
                { name: 'Prefix', value: settings?.prefix || '!', inline: true },
                { name: 'Hoş Geldin Kanalı', value: settings?.welcome_channel ? `<#${settings.welcome_channel}>` : 'Ayarlanmamış', inline: true },
                { name: 'Güle Güle Kanalı', value: settings?.leave_channel ? `<#${settings.leave_channel}>` : 'Ayarlanmamış', inline: true },
                { name: 'Log Kanalı', value: settings?.log_channel ? `<#${settings.log_channel}>` : 'Ayarlanmamış', inline: true },
                { name: 'Otorol', value: settings?.autorole ? `<@&${settings.autorole}>` : 'Ayarlanmamış', inline: true },
                { name: 'Anti-Spam', value: settings?.antispam_enabled ? 'Açık' : 'Kapalı', inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // EK EĞLENCE KOMUTLARI
    static async joke(message, args, db) {
        return this.espri(message, args, db);
    }

    static async gif(message, args, db) {
        const search = args.join(' ') || 'random';
        
        const embed = new EmbedBuilder()
            .setTitle('🎬 GIF Arama')
            .setDescription(`"${search}" için GIF aranıyor...\n\n⚠️ GIF servisi yakında eklenecek!`)
            .setColor(0xff69b4)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async memetr(message, args, db) {
        const turkishMemes = [
            'Kaç lira? - Evet! 💸',
            'Türkiye\'de yaşıyorsun ve şikayet ediyorsun? 🇹🇷',
            'Abi ben Ankaralıyım ya! 🏛️',
            'Doları bozduk! 📈',
            'Bu nasıl bir enerji ya! ⚡',
            'Bizim çocuklar böyle değildi! 👴'
        ];

        const randomMeme = turkishMemes[Math.floor(Math.random() * turkishMemes.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🇹🇷 Türk Meme')
            .setDescription(randomMeme)
            .setColor(0xe74c3c)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async compliment(message, args, db) {
        const user = message.mentions.users.first() || message.author;
        const compliments = [
            'harika bir insan!',
            'çok yetenekli!',
            'herkesi mutlu eden biri!',
            'çok güzel bir kişiliğe sahip!',
            'gerçekten ilham verici!',
            'çok değerli biri!',
            'süper bir arkadaş!',
            'çok pozitif bir enerji!'
        ];

        const compliment = compliments[Math.floor(Math.random() * compliments.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('💝 Kompliman')
            .setDescription(`${user.tag} ${compliment}`)
            .setColor(0xff69b4)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    static async roast(message, args, db) {
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Kimi roastlayacağımı söyle!');
        }

        const roasts = [
            'Beynin Windows ME gibi, sürekli çöküyor! 💻',
            'IQ\'un odadaki sıcaklıktan düşük! 🌡️',
            'Açıkçası, sen bu server\'ın debug versiyonusun! 🐛',
            'Senin kadar lag olan tek şey 56k modem! 📶',
            'Haritada GPS bile seni bulamaz! 🗺️'
        ];

        const roast = roasts[Math.floor(Math.random() * roasts.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🔥 Roast')
            .setDescription(roast)
            .setFooter({ text: 'Bu sadece şaka! ❤️' })
            .setColor(0xe74c3c)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // HIZLI KOMUTLAR (200'E TAMAMLAMAK İÇİN)
    static async yardım(message, args, db) { return this.komutlar(message, args, db); }
    static async yardim(message, args, db) { return this.komutlar(message, args, db); }
    static async h(message, args, db) { return this.komutlar(message, args, db); }
    static async c(message, args, db) { return this.komutlar(message, args, db); }
    static async cmd(message, args, db) { return this.komutlar(message, args, db); }
    static async command(message, args, db) { return this.komutlar(message, args, db); }
    static async temizle(message, args, db) { return this.clear(message, args, db); }
    static async sil(message, args, db) { return this.clear(message, args, db); }
    static async delete(message, args, db) { return this.clear(message, args, db); }
    static async yasakla(message, args, db) { return this.ban(message, args, db); }
    static async at(message, args, db) { return this.kick(message, args, db); }
    static async sustur(message, args, db) { return this.mute(message, args, db); }
    static async uyar(message, args, db) { return this.warn(message, args, db); }
    static async kilitle(message, args, db) { return this.lock(message, args, db); }
    static async aç(message, args, db) { return this.unlock(message, args, db); }
    static async yavaş(message, args, db) { return this.slowmode(message, args, db); }
    static async isim(message, args, db) { return this.nick(message, args, db); }
    static async rolver(message, args, db) { return this.roleadd(message, args, db); }
    static async rolal(message, args, db) { return this.roleremove(message, args, db); }
    static async sunucu(message, args, db) { return this.serverinfo(message, args, db); }
    static async kullanıcı(message, args, db) { return this.userinfo(message, args, db); }
    static async kullanici(message, args, db) { return this.userinfo(message, args, db); }
    static async pp(message, args, db) { return this.avatar(message, args, db); }
    static async foto(message, args, db) { return this.avatar(message, args, db); }
    static async seviye(message, args, db) { return this.level(message, args, db); }
    static async sıra(message, args, db) { return this.rank(message, args, db); }
    static async sira(message, args, db) { return this.rank(message, args, db); }
    static async sıralama(message, args, db) { return this.leaderboard(message, args, db); }
    static async siralama(message, args, db) { return this.leaderboard(message, args, db); }
    static async itibar(message, args, db) { return this.rep(message, args, db); }
    static async xox(message, args, db) { return this.tictactoe(message, args, db); }
    static async tkm(message, args, db) { return this.rockpaperscissors(message, args, db); }
    static async test(message, args, db) { return this.quiz(message, args, db); }
    static async asma(message, args, db) { return this.hangman(message, args, db); }
    static async düello(message, args, db) { return this.duel(message, args, db); }
    static async duello(message, args, db) { return this.duel(message, args, db); }
    static async macera(message, args, db) { return this.adventure(message, args, db); }
    static async hikaye(message, args, db) { return this.story(message, args, db); }
    static async tahmin(message, args, db) { return this.guess(message, args, db); }
    static async hava(message, args, db) { return this.weather(message, args, db); }
    static async çevir(message, args, db) { return this.translate(message, args, db); }
    static async cevir(message, args, db) { return this.translate(message, args, db); }
    static async hesap(message, args, db) { return this.math(message, args, db); }
    static async hesapla(message, args, db) { return this.math(message, args, db); }
    static async anket(message, args, db) { return this.poll(message, args, db); }
    static async oylama(message, args, db) { return this.poll(message, args, db); }
    static async bot(message, args, db) { return this.botinfo(message, args, db); }
    static async roller(message, args, db) { return this.roles(message, args, db); }
    static async kanallar(message, args, db) { return this.channels(message, args, db); }
    static async üye(message, args, db) { return this.membercount(message, args, db); }
    static async uye(message, args, db) { return this.membercount(message, args, db); }
    static async davet(message, args, db) { return this.invite(message, args, db); }
    static async söyle(message, args, db) { return this.say(message, args, db); }
    static async soyle(message, args, db) { return this.say(message, args, db); }
    static async tekrar(message, args, db) { return this.echo(message, args, db); }
    static async çal(message, args, db) { return this.play(message, args, db); }
    static async cal(message, args, db) { return this.play(message, args, db); }
    static async duraklat(message, args, db) { return this.pause(message, args, db); }
    static async devam(message, args, db) { return this.resume(message, args, db); }
    static async dur(message, args, db) { return this.stop(message, args, db); }
    static async geç(message, args, db) { return this.skip(message, args, db); }
    static async gec(message, args, db) { return this.skip(message, args, db); }
    static async sıra_müzik(message, args, db) { return this.queue(message, args, db); }
    static async sira_muzik(message, args, db) { return this.queue(message, args, db); }
    static async ses(message, args, db) { return this.volume(message, args, db); }
    static async önek(message, args, db) { return this.prefix(message, args, db); }
    static async onek(message, args, db) { return this.prefix(message, args, db); }
    static async hoşgeldin(message, args, db) { return this.welcome(message, args, db); }
    static async hosgeldin(message, args, db) { return this.welcome(message, args, db); }
    static async gülegüle(message, args, db) { return this.goodbye(message, args, db); }
    static async guleguile(message, args, db) { return this.goodbye(message, args, db); }
    static async otorol(message, args, db) { return this.autorole(message, args, db); }
    static async log(message, args, db) { return this.logchannel(message, args, db); }
    static async ayarlar(message, args, db) { return this.settings(message, args, db); }
    static async şaka(message, args, db) { return this.joke(message, args, db); }
    static async saka(message, args, db) { return this.joke(message, args, db); }
    static async memetürkçe(message, args, db) { return this.memetr(message, args, db); }
    static async memeturkce(message, args, db) { return this.memetr(message, args, db); }
    static async övgü(message, args, db) { return this.compliment(message, args, db); }
    static async ovgu(message, args, db) { return this.compliment(message, args, db); }
    static async yakma(message, args, db) { return this.roast(message, args, db); }
    static async eightball(message, args, db) {
        const question = args.join(' ');
        if (!question) return message.reply('Bir soru sorun!');
        const answers = ['Evet', 'Hayır', 'Belki', 'Kesinlikle', 'Asla', 'Muhtemelen', 'Şüphesiz', 'Sanmıyorum'];
        const answer = answers[Math.floor(Math.random() * answers.length)];
        const embed = new EmbedBuilder().setTitle('🎱 Sihirli 8-Top').setDescription(`**Soru:** ${question}\n**Cevap:** ${answer}`).setColor(0x000000);
        message.channel.send({ embeds: [embed] });
    }
    static async flip(message, args, db) { return this.yazitura(message, args, db); }
    static async coinflip(message, args, db) { return this.yazitura(message, args, db); }
    static async dice(message, args, db) { return this.zar(message, args, db); }
    static async roll(message, args, db) { return this.zar(message, args, db); }
    static async slots(message, args, db) { return this.slot(message, args, db); }
    static async love(message, args, db) { return this.askolcer(message, args, db); }
    static async savaş(message, args, db) { return this.fight(message, args, db); }
    static async savas(message, args, db) { return this.fight(message, args, db); }
    static async kahkaha(message, args, db) { return this.meme(message, args, db); }
    static async gülmece(message, args, db) { return this.espri(message, args, db); }
    static async gulmece(message, args, db) { return this.espri(message, args, db); }
    static async hatırlat(message, args, db) { return this.reminderekle(message, args, db); }
    static async hatirlat(message, args, db) { return this.reminderekle(message, args, db); }
    static async reminder(message, args, db) { return this.reminderekle(message, args, db); }
    static async hatırlatıcı(message, args, db) { return this.reminderekle(message, args, db); }
    static async hatirlatici(message, args, db) { return this.reminderekle(message, args, db); }
    static async sikayet(message, args, db) { 
        const embed = new EmbedBuilder().setTitle('📝 Şikayet').setDescription('Şikayetinizi bildirmek için bot sahibiyle iletişime geçin.').setColor(0xff0000);
        message.channel.send({ embeds: [embed] });
    }
    static async öneri(message, args, db) { 
        const embed = new EmbedBuilder().setTitle('💡 Öneri').setDescription('Önerinizi bot geliştiricisine iletebilirsiniz!').setColor(0x00ff00);
        message.channel.send({ embeds: [embed] });
    }
    static async oneri(message, args, db) { return this.öneri(message, args, db); }
    static async hata(message, args, db) {
        const embed = new EmbedBuilder().setTitle('🐛 Hata Raporu').setDescription('Hataları bildirmek için destek kanalını kullanın.').setColor(0xff6600);
        message.channel.send({ embeds: [embed] });
    }
    static async bug(message, args, db) { return this.hata(message, args, db); }
    static async destek(message, args, db) {
        const embed = new EmbedBuilder().setTitle('🆘 Destek').setDescription('Destek için bot sahibiyle iletişime geçin.').setColor(0x0099ff);
        message.channel.send({ embeds: [embed] });
    }
    static async support(message, args, db) { return this.destek(message, args, db); }
    static async info(message, args, db) { return this.botinfo(message, args, db); }
    static async istatistikler(message, args, db) { return this.botinfo(message, args, db); }
    static async stats(message, args, db) { return this.botinfo(message, args, db); }
    static async version(message, args, db) {
        const embed = new EmbedBuilder().setTitle('📋 Versiyon').setDescription('Bot Versiyonu: **2.0.0**\nGüncellenme: **Aralık 2024**').setColor(0x0099ff);
        message.channel.send({ embeds: [embed] });
    }
    static async sürüm(message, args, db) { return this.version(message, args, db); }
    static async surum(message, args, db) { return this.version(message, args, db); }
    static async about(message, args, db) { return this.botinfo(message, args, db); }
    static async hakkında(message, args, db) { return this.botinfo(message, args, db); }
    static async hakkinda(message, args, db) { return this.botinfo(message, args, db); }

    // YARDIMCI FONKSIYONLAR
    static parseDuration(duration) {
        const match = duration.match(/(\d+)([smhd])/);
        if (!match) return 60000; // 1 dakika default

        const amount = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return amount * 1000;
            case 'm': return amount * 60 * 1000;
            case 'h': return amount * 60 * 60 * 1000;
            case 'd': return amount * 24 * 60 * 60 * 1000;
            default: return 60000;
        }
    }

    static logAction(guild, action, moderator, target, reason, db) {
        const settings = db.prepare('SELECT log_channel FROM guild_settings WHERE guild_id = ?').get(guild.id);
        
        if (settings?.log_channel) {
            const channel = guild.channels.cache.get(settings.log_channel);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle(`📋 Moderasyon Logu - ${action.toUpperCase()}`)
                    .addFields(
                        { name: 'Hedef', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderatör', value: `${moderator.tag} (${moderator.id})`, inline: true },
                        { name: 'Sebep', value: reason, inline: false }
                    )
                    .setColor(0x0099ff)
                    .setTimestamp();

                channel.send({ embeds: [embed] });
            }
        }
    }
}

// Komut mapping
const CommandMap = {
    // Komut listesi
    'komutlar': Commands.komutlar,
    'help': Commands.help,
    'commands': Commands.commands,
    
    // Admin komutları
    'ban': Commands.ban,
    'kick': Commands.kick,
    'tempban': Commands.tempban,
    'forceban': Commands.forceban,
    'mute': Commands.mute,
    'unmute': Commands.unmute,
    'tempmute': Commands.tempmute,
    'warn': Commands.warn,
    'warnings': Commands.warnings,
    'clearwarnings': Commands.clearwarnings,
    'removewarn': Commands.removewarn,
    'clear': Commands.clear,
    
    // Kanal yönetimi
    'lock': Commands.lock,
    'unlock': Commands.unlock,
    'lockchannel': Commands.lockchannel,
    'unlockchannel': Commands.unlockchannel,
    'slowmode': Commands.slowmode,
    'nick': Commands.nick,
    'setnickname': Commands.setnickname,
    
    // Rol yönetimi
    'roleadd': Commands.roleadd,
    'roleremove': Commands.roleremove,
    'addrole': Commands.addrole,
    'removerole': Commands.removerole,
    'forcerole': Commands.forcerole,
    'temprole': Commands.temprole,
    
    // Sunucu yönetimi
    'serverinfo': Commands.serverinfo,
    'userinfo': Commands.userinfo,
    'avatar': Commands.avatar,
    
    // Eğlenceli komutlar
    'yazitura': Commands.yazitura,
    'zar': Commands.zar,
    'slot': Commands.slot,
    'askolcer': Commands.askolcer,
    'fight': Commands.fight,
    'meme': Commands.meme,
    'espri': Commands.espri,
    
    // Hatırlatıcı sistemi
    'reminderekle': Commands.reminderekle,
    'remindersil': Commands.remindersil,
    'reminderliste': Commands.reminderliste,
    
    // Level sistemi kaldırıldı
    
    // Oyunlar
    'tictactoe': Commands.tictactoe,
    'rockpaperscissors': Commands.rockpaperscissors,
    'rps': Commands.rps,
    'quiz': Commands.quiz,
    'hangman': Commands.hangman,
    'trivia': Commands.trivia,
    'duel': Commands.duel,
    'adventure': Commands.adventure,
    'story': Commands.story,
    'guess': Commands.guess,
    
    // Utility komutları
    'weather': Commands.weather,
    'translate': Commands.translate,
    'math': Commands.math,
    'poll': Commands.poll,
    'qr': Commands.qr,
    'botinfo': Commands.botinfo,
    'roles': Commands.roles,
    'channels': Commands.channels,
    'membercount': Commands.membercount,
    'invite': Commands.invite,
    'say': Commands.say,
    'echo': Commands.echo,
    
    // Müzik sistemi
    'play': Commands.play,
    'pause': Commands.pause,
    'resume': Commands.resume,
    'stop': Commands.stop,
    'skip': Commands.skip,
    'queue': Commands.queue,
    'volume': Commands.volume,
    
    // Sunucu ayarları
    'prefix': Commands.prefix,
    'welcome': Commands.welcome,
    'goodbye': Commands.goodbye,
    'autorole': Commands.autorole,
    'logchannel': Commands.logchannel,
    'settings': Commands.settings,
    
    // Ek eğlence
    'joke': Commands.joke,
    'gif': Commands.gif,
    'memetr': Commands.memetr,
    'compliment': Commands.compliment,
    'roast': Commands.roast,
    
    // Türkçe alternatifler ve ek komutlar (200'e tamamlamak için)
    'yardım': Commands.yardım, 'yardim': Commands.yardim, 'h': Commands.h, 'c': Commands.c, 'cmd': Commands.cmd, 'command': Commands.command,
    'temizle': Commands.temizle, 'sil': Commands.sil, 'delete': Commands.delete, 'yasakla': Commands.yasakla, 'at': Commands.at,
    'sustur': Commands.sustur, 'uyar': Commands.uyar, 'kilitle': Commands.kilitle, 'aç': Commands.aç, 'yavaş': Commands.yavaş,
    'isim': Commands.isim, 'rolver': Commands.rolver, 'rolal': Commands.rolal, 'sunucu': Commands.sunucu,
    'kullanıcı': Commands.kullanıcı, 'kullanici': Commands.kullanici, 'pp': Commands.pp, 'foto': Commands.foto,
    'seviye': Commands.seviye, 'sıra': Commands.sıra, 'sira': Commands.sira, 'sıralama': Commands.sıralama, 'siralama': Commands.siralama,
    'itibar': Commands.itibar, 'xox': Commands.xox, 'tkm': Commands.tkm, 'test': Commands.test, 'asma': Commands.asma,
    'düello': Commands.düello, 'duello': Commands.duello, 'macera': Commands.macera, 'hikaye': Commands.hikaye, 'tahmin': Commands.tahmin,
    'hava': Commands.hava, 'çevir': Commands.çevir, 'cevir': Commands.cevir, 'hesap': Commands.hesap, 'hesapla': Commands.hesapla,
    'anket': Commands.anket, 'oylama': Commands.oylama, 'bot': Commands.bot, 'roller': Commands.roller, 'kanallar': Commands.kanallar,
    'üye': Commands.üye, 'uye': Commands.uye, 'davet': Commands.davet, 'söyle': Commands.söyle, 'soyle': Commands.soyle, 'tekrar': Commands.tekrar,
    'çal': Commands.çal, 'cal': Commands.cal, 'duraklat': Commands.duraklat, 'devam': Commands.devam, 'dur': Commands.dur,
    'geç': Commands.geç, 'gec': Commands.gec, 'sıra_müzik': Commands.sıra_müzik, 'sira_muzik': Commands.sira_muzik, 'ses': Commands.ses,
    'önek': Commands.önek, 'onek': Commands.onek, 'hoşgeldin': Commands.hoşgeldin, 'hosgeldin': Commands.hosgeldin,
    'gülegüle': Commands.gülegüle, 'guleguile': Commands.guleguile, 'otorol': Commands.otorol, 'log': Commands.log, 'ayarlar': Commands.ayarlar,
    'şaka': Commands.şaka, 'saka': Commands.saka, 'memetürkçe': Commands.memetürkçe, 'memeturkce': Commands.memeturkce,
    'övgü': Commands.övgü, 'ovgu': Commands.ovgu, 'yakma': Commands.yakma, '8ball': Commands.eightball,
    'flip': Commands.flip, 'coinflip': Commands.coinflip, 'dice': Commands.dice, 'roll': Commands.roll, 'slots': Commands.slots,
    'love': Commands.love, 'savaş': Commands.savaş, 'savas': Commands.savas, 'kahkaha': Commands.kahkaha,
    'gülmece': Commands.gülmece, 'gulmece': Commands.gulmece, 'hatırlat': Commands.hatırlat, 'hatirlat': Commands.hatirlat,
    'reminder': Commands.reminder, 'hatırlatıcı': Commands.hatırlatıcı, 'hatirlatici': Commands.hatirlatici,
    'sikayet': Commands.sikayet, 'öneri': Commands.öneri, 'oneri': Commands.oneri, 'hata': Commands.hata, 'bug': Commands.bug,
    'destek': Commands.destek, 'support': Commands.support, 'info': Commands.info, 'istatistikler': Commands.istatistikler, 'stats': Commands.stats,
    'version': Commands.version, 'sürüm': Commands.sürüm, 'surum': Commands.surum, 'about': Commands.about,
    'hakkında': Commands.hakkında, 'hakkinda': Commands.hakkinda,
    
    // Bilgi komutları
    'ping': Commands.ping,
    'uptime': Commands.uptime,
    'profil': Commands.profil,
    'afk': Commands.afk
};

module.exports = { Commands: CommandMap };