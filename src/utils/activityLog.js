const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

let logChannel = null;

const TYPE_COLORS = {
  'Slash Komut': 0x5865f2,
  'Buton': 0x57f287,
  'Select Menu': 0xfee75c,
  'Prefix Komut': 0xeb459e,
};

function initLogChannel(client) {
  const id = process.env.LOG_CHANNEL_ID;
  if (!id) return;
  logChannel = client.channels.cache.get(id) ?? null;
  if (logChannel) {
    logger.info(`Activity log channel: #${logChannel.name} (${id})`);
  } else {
    logger.warn(`LOG_CHANNEL_ID "${id}" bulunamadı. Önce bot o sunucuda olmalı.`);
  }
}

async function logActivity({ type, action, user, guild, channel }) {
  logger.info(`[ACTIVITY] [${type}] ${user.tag} (${user.id}) | "${guild?.name ?? 'DM'}" #${channel?.name ?? '—'} | ${action}`);

  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(TYPE_COLORS[type] ?? 0x99aab5)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ size: 64 }) })
    .addFields(
      { name: 'İşlem', value: `\`${action}\``, inline: false },
      { name: 'Tür', value: type, inline: true },
      { name: 'Kullanıcı', value: `<@${user.id}>`, inline: true },
      { name: 'Sunucu', value: guild?.name ?? 'DM', inline: true },
      { name: 'Kanal', value: channel ? `<#${channel.id}>` : '—', inline: true },
    )
    .setFooter({ text: `ID: ${user.id}` })
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(err =>
    logger.error('Log kanalına mesaj gönderilemedi:', err),
  );
}

module.exports = { initLogChannel, logActivity };
