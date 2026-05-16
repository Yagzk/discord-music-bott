const { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const { MusicPlayer } = require('../../player/MusicPlayer');
const { clearHistory, getHistory } = require('../../utils/history');
const { createErrorEmbed, createSuccessEmbed, withBrandFooter } = require('../../utils/embeds');

module.exports = {
  name: 'history',
  description: 'Show recently played songs',
  aliases: ['hist', 'recent'],
  category: 'music',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Show recently played songs')
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Show recently played songs'),
    )
    .addSubcommand(sub =>
      sub
        .setName('play')
        .setDescription('Play a song from history')
        .addIntegerOption(opt =>
          opt.setName('position').setDescription('History number').setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('clear').setDescription('Clear this server history'),
    ),

  async execute(message, args, client) {
    const action = (args[0] ?? 'list').toLowerCase();

    if (action === 'list') {
      return message.reply({ embeds: [createHistoryEmbed(getHistory(message.guild.id))] });
    }

    if (action === 'play') {
      const position = parseInt(args[1], 10);
      if (Number.isNaN(position) || position < 1) {
        return message.reply({ embeds: [createErrorEmbed('Usage: `!history play <number>`')] });
      }

      return playFromHistory(message, client, message.author, position, payload => message.reply(payload));
    }

    if (action === 'clear') {
      const count = clearHistory(message.guild.id);
      return message.reply({ embeds: [createSuccessEmbed(`Cleared **${count}** history item(s).`)] });
    }

    return message.reply({ embeds: [createErrorEmbed('Usage: `!history <list | play | clear>`')] });
  },

  async slashExecute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      return interaction.reply({ embeds: [createHistoryEmbed(getHistory(interaction.guild.id))] });
    }

    if (subcommand === 'play') {
      await interaction.deferReply();
      const position = interaction.options.getInteger('position');
      return playFromHistory(interaction, client, interaction.user, position, payload => interaction.editReply(payload));
    }

    if (subcommand === 'clear') {
      const count = clearHistory(interaction.guild.id);
      return interaction.reply({ embeds: [createSuccessEmbed(`Cleared **${count}** history item(s).`)] });
    }
  },
};

async function playFromHistory(source, client, user, position, reply) {
  const voiceChannel = source.member?.voice?.channel;
  if (!voiceChannel) {
    return reply({ embeds: [createErrorEmbed('You must be in a voice channel!')] });
  }

  const history = getHistory(source.guild.id);
  const item = history[position - 1];
  if (!item) {
    return reply({ embeds: [createErrorEmbed('History number not found.')] });
  }

  const playerResult = getOrCreatePlayer(client, source.guild, voiceChannel, source.channel);
  if (playerResult.error) {
    return reply({ embeds: [createErrorEmbed(playerResult.error)] });
  }

  const player = playerResult.player;
  const wasPlaying = player.isPlaying;
  await player.addToQueue({
    title: item.title,
    url: item.url,
    duration: item.duration,
    thumbnail: item.thumbnail,
    channel: item.channel,
    requestedBy: user,
  });

  return reply({
    embeds: [
      createSuccessEmbed(`${wasPlaying ? 'Added to queue' : 'Started playing'} from history: **${item.title}**.`),
    ],
  });
}

function getOrCreatePlayer(client, guild, voiceChannel, textChannel) {
  const perms = voiceChannel.permissionsFor(guild.members.me);
  if (!perms?.has(PermissionsBitField.Flags.Connect) || !perms?.has(PermissionsBitField.Flags.Speak)) {
    return { error: "I don't have permission to join or speak in your voice channel." };
  }

  let player = client.musicPlayers.get(guild.id);
  if (!player) {
    player = new MusicPlayer(guild.id, client);
    client.musicPlayers.set(guild.id, player);
  }

  player.textChannel = textChannel;
  player.connect(voiceChannel);
  return { player };
}

function createHistoryEmbed(history) {
  const description = history.length
    ? history
        .slice(0, 20)
        .map((song, index) => {
          const requester = song.requestedBy ? `<@${song.requestedBy}>` : song.requestedByName;
          return `**${index + 1}.** [${song.title}](${song.url}) \`${song.duration}\` • ${requester}`;
        })
        .join('\n')
    : 'No songs in history yet.';

  const suffix = history.length > 20 ? `\n\n...and ${history.length - 20} more.` : '';

  return withBrandFooter(
    new EmbedBuilder()
      .setColor('#A78BFA')
      .setAuthor({ name: 'Playback History' })
      .setTitle('Recently Played')
      .setDescription(description + suffix)
      .setTimestamp(),
    `${history.length} saved item(s)`,
  );
}

Object.assign(module.exports, {
  createHistoryEmbed,
});
