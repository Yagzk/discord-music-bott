const { PermissionsBitField } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'cc',
  description: 'Son 50 mesajı sil',
  aliases: [],
  category: 'utility',
  cooldown: 5,

  async execute(message, _args, _client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply({ embeds: [createErrorEmbed('Bu komutu kullanmak için **Mesajları Yönet** iznin olmalı.')] });
    }

    const botPerms = message.channel.permissionsFor(message.guild.members.me);
    if (!botPerms?.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply({ embeds: [createErrorEmbed('Bu kanalda mesaj silme iznim yok.')] });
    }

    let messages;
    try {
      messages = await message.channel.messages.fetch({ limit: 50 });
    } catch {
      return message.reply({ embeds: [createErrorEmbed('Mesajlar alınamadı.')] });
    }

    // Discord bulk delete sadece 14 günden yeni mesajları siler
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const deletable = messages.filter(m => m.createdTimestamp > cutoff);

    if (!deletable.size) {
      return message.reply({ embeds: [createErrorEmbed('Silinebilecek mesaj yok (14 günden eski mesajlar silinemez).')] });
    }

    let deleted;
    try {
      deleted = await message.channel.bulkDelete(deletable, true);
    } catch {
      return message.reply({ embeds: [createErrorEmbed('Mesajlar silinirken hata oluştu.')] });
    }

    const confirm = await message.channel.send({ embeds: [createSuccessEmbed(`**${deleted.size}** mesaj silindi.`)] });
    setTimeout(() => confirm.delete().catch(() => {}), 4000);
  },
};
