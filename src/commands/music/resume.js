const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'resume',
  description: 'Resume the paused song',
  aliases: ['unpause'],
  category: 'music',
  cooldown: 2,

  data: new SlashCommandBuilder().setName('resume').setDescription('Resume the paused song'),

  async execute(message, _args, client) {
    const player = client.musicPlayers.get(message.guild.id);
    if (!player) {
      return message.reply({ embeds: [createErrorEmbed('Nothing is paused!')] });
    }

    const ok = player.resume();
    await message.reply({
      embeds: [ok ? createSuccessEmbed('Resumed ▶️') : createErrorEmbed('Not currently paused.')],
    });
  },

  async slashExecute(interaction, client) {
    const player = client.musicPlayers.get(interaction.guild.id);
    if (!player) {
      return interaction.reply({ embeds: [createErrorEmbed('Nothing is paused!')], ephemeral: true });
    }

    const ok = player.resume();
    await interaction.reply({
      embeds: [ok ? createSuccessEmbed('Resumed ▶️') : createErrorEmbed('Not currently paused.')],
    });
  },
};
