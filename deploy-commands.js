require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');

const commands = [];
const categories = readdirSync(join(__dirname, 'src/commands'));

for (const category of categories) {
  const files = readdirSync(join(__dirname, 'src/commands', category)).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(join(__dirname, 'src/commands', category, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash command(s)…`);

    // Guild-scoped (instant, for testing)
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Deployed to guild ${process.env.GUILD_ID}`);
    } else {
      // Global (can take up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('✅ Deployed globally (may take up to 1 hour to appear)');
    }
  } catch (err) {
    console.error('❌ Deploy failed:', err);
  }
})();
