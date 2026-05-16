const { readdirSync } = require('fs');
const { join } = require('path');
const logger = require('../utils/logger');

function handleCommands(client) {
  const categories = readdirSync(join(__dirname, '../commands'));

  for (const category of categories) {
    const files = readdirSync(join(__dirname, '../commands', category)).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const command = require(join(__dirname, '../commands', category, file));

      // Register prefix command and aliases
      if (command.name) {
        client.commands.set(command.name, command);
        command.aliases?.forEach(alias => client.commands.set(alias, command));
      }

      // Register slash command
      if (command.data) {
        client.slashCommands.set(command.data.name, command);
      }

      logger.info(`Loaded command: ${command.name || command.data?.name}`);
    }
  }
}

module.exports = { handleCommands };
