import { config } from '../config/config.js';
import { 
  InteractionResponseType, 
  InteractionResponseFlags, 
  MessageComponentTypes 
} from 'discord-interactions';
import { DISCORD_CONSTANTS } from '../config/constants.js';

/**
 * Discord API Request handler
 */
export async function DiscordRequest(endpoint, options = {}) {
  // Append endpoint to URL if it doesn't already include the base URL
  const url = endpoint.startsWith('http') ? endpoint : `https://discord.com/api/v10/${endpoint}`;
  
  // Add authentication
  const headers = {
    'Authorization': `Bot ${config.discord.botToken}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'User-Agent': `DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)`,
    ...options.headers
  };

  // Stringify body if it's an object
  const body = options.body && typeof options.body === 'object' 
    ? JSON.stringify(options.body) 
    : options.body;

  const response = await fetch(url, {
    ...options,
    headers,
    body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API Error: ${response.status} ${response.statusText} - ${error}`);
  }

  return response;
}

export function getUserId(req) {
  const context = req.body.context;
  return context === 0 ? req.body.member.user.id : req.body.user.id;
}

export function getChannelId(req) {
  return req.body.channel_id;
}

export function getGuildId(req) {
  return req.body.guild_id || null;
}

function createResponse(content, ephemeral = false, components = []) {
  
  const flags = ephemeral 
    ? InteractionResponseFlags.EPHEMERAL 
    : undefined;

  const data = {
    content,
    flags
  };

  // Only add components if they exist
  if (components && components.length > 0) {
    data.components = components;
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data
  };
}

export function createErrorResponse(message, ephemeral = true) {
  return createResponse(message, ephemeral);
}

export function createSuccessResponse(message, ephemeral = false, components = []) {
  return createResponse(message, ephemeral, components);
}

export async function addUserToThread(threadId, userId) {
  await DiscordRequest(`channels/${threadId}/thread-members/${userId}`, {
    method: 'PUT'
  });
}

export async function createThread(channelId, name, autoArchiveDuration = 1440) {
  const response = await DiscordRequest(`channels/${channelId}/threads`, {
    method: 'POST',
    body: {
      name,
      type: DISCORD_CONSTANTS.THREAD_TYPE.PUBLIC_THREAD,
      auto_archive_duration: autoArchiveDuration
    }
  });
  const data = await response.json();
  if (!data || !data.id) {
    throw new Error('No thread ID returned from Discord API');
  }
  return data;
}

export async function getThreadParentChannel(threadId) {
  const response = await DiscordRequest(`channels/${threadId}`);
  const data = await response.json();
  return data.parent_id;
}

export async function postToChannel(channelId, content) {
  await DiscordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: { content }
  });
}