import 'dotenv/config';

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    console.log(`🔄 Registering ${commands.length} commands...`);
    console.log('Commands:', commands.map(cmd => cmd.name).join(', '));
    
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    const url = 'https://discord.com/api/v10/' + endpoint;
    
    const res = await fetch(url, {
      method: 'PUT', 
      body: JSON.stringify(commands),
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
      }
    });
    
    if (!res.ok) {
      const data = await res.json();
      console.log('❌ Registration failed:', res.status);
      throw new Error(JSON.stringify(data));
    }
    
    const data = await res.json();
    console.log(`✅ Successfully registered ${data.length} commands`);
    console.log('Registered commands:', data.map(cmd => cmd.name).join(', '));
  } catch (err) {
    console.error('❌ Registration error:', err);
  }
}

export async function InstallGuildCommands(appId, guildId, commands) {
  // API endpoint for guild-specific commands (instant updates)
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

  try {
    console.log(`🔄 Registering ${commands.length} guild commands for server ${guildId}...`);
    console.log('Commands:', commands.map(cmd => cmd.name).join(', '));
    
    const url = 'https://discord.com/api/v10/' + endpoint;
    
    const res = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(commands),
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
      }
    });
    
    if (!res.ok) {
      const data = await res.json();
      console.log('❌ Guild registration failed:', res.status);
      throw new Error(JSON.stringify(data));
    }
    
    const data = await res.json();
    console.log(`✅ Successfully registered ${data.length} guild commands`);
    console.log('Guild commands:', data.map(cmd => cmd.name).join(', '));
  } catch (err) {
    console.error('❌ Guild registration error:', err);
  }
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
