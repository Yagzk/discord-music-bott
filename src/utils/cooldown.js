const CooldownManager = {
  check(client, userId, command) {
    const name = command.name || command.data?.name;
    if (!client.cooldowns.has(name)) {
      client.cooldowns.set(name, new Map());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(name);
    const cooldownMs = (command.cooldown ?? 3) * 1000;

    if (timestamps.has(userId)) {
      const expiry = timestamps.get(userId) + cooldownMs;
      if (now < expiry) {
        const left = ((expiry - now) / 1000).toFixed(1);
        return `Please wait **${left}s** before using \`${name}\` again.`;
      }
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownMs);
    return null;
  },
};

module.exports = { CooldownManager };
