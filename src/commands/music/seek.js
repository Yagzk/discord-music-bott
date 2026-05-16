const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

function parseTime(input) {
  const parts = String(input).trim().split(':').map(Number);
  if (parts.some(isNaN) || parts.some(n => n < 0)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function fmtSeconds(sec) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${m}:${String(ss).padStart(2, '0')}`;
}

async function handleSeek(query, member, client, guild) {
  const seconds = parseTime(query);
  if (seconds === null) {
    return { error: 'Geçersiz zaman formatı. Örnek: `1:30` veya `90`' };
  }

  const player = client.musicPlayers.get(guild.id);
  if (!player?.isPlaying) {
    return { error: 'Şu an bir şey çalmıyor!' };
  }

  const userChannelId = member?.voice?.channelId;
  const botChannelId = player.voiceConnection?.joinConfig?.channelId;
  if (!userChannelId || userChannelId !== botChannelId) {
    return { error: 'Botla aynı ses kanalında olman gerekiyor.' };
  }

  const ok = await player.seek(seconds);
  if (!ok) return { error: 'Seek işlemi başarısız oldu.' };

  return { position: fmtSeconds(seconds), title: player.queue.currentSong?.title };
}

module.exports = {
  name: 'seek',
  description: 'Şarkıda belirli bir konuma atla',
  aliases: ['sk'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Şarkıda belirli bir konuma atla')
    .addStringOption(opt =>
      opt.setName('time')
        .setDescription('Konum (örn: 1:30 veya 90)')
        .setRequired(true),
    ),

  async execute(message, args, client) {
    if (!args.length) {
      return message.reply({ embeds: [createErrorEmbed('Konum belirt. Örnek: `.seek 1:30`')] });
    }

    const result = await handleSeek(args[0], message.member, client, message.guild);
    if (result.error) {
      return message.reply({ embeds: [createErrorEmbed(result.error)] });
    }

    return message.reply({
      embeds: [createSuccessEmbed(`**${result.title}** — \`${result.position}\` konumuna atlandı.`)],
    });
  },

  async slashExecute(interaction, client) {
    const result = await handleSeek(
      interaction.options.getString('time'),
      interaction.member,
      client,
      interaction.guild,
    );

    if (result.error) {
      return interaction.reply({ embeds: [createErrorEmbed(result.error)], ephemeral: true });
    }

    return interaction.reply({
      embeds: [createSuccessEmbed(`**${result.title}** — \`${result.position}\` konumuna atlandı.`)],
    });
  },
};
