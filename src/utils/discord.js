import { config } from '../config/config.js';
import { 
  InteractionResponseType, 
  InteractionResponseFlags, 
  MessageComponentTypes 
} from 'discord-interactions';
import { DISCORD_CONSTANTS } from '../config/constants.js';

/**
 * Discord API Request handler
 * @param {string} endpoint - Discord API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
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

/**
 * Get user ID from request context
 * @param {Object} req - Express request object
 * @returns {string} - User ID
 */
export function getUserId(req) {
  const context = req.body.context;
  return context === 0 ? req.body.member.user.id : req.body.user.id;
}

/**
 * Get channel ID from request
 * @param {Object} req - Express request object
 * @returns {string} - Channel ID
 */
export function getChannelId(req) {
  return req.body.channel_id;
}

/**
 * Get guild ID from request (null in DM contexts)
 * @param {Object} req - Express request object
 * @returns {string|null} - Guild ID
 */
export function getGuildId(req) {
  return req.body.guild_id || null;
}

/**
 * Create a standardized Discord response
 * @param {string} content - Message content
 * @param {boolean} ephemeral - Whether message should be ephemeral
 * @param {Array} components - Additional message components
 * @returns {Object} - Discord interaction response
 */
export function createResponse(content, ephemeral = false, components = []) {
  
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

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {boolean} ephemeral - Whether message should be ephemeral (default: true)
 * @returns {Object} - Discord error response
 */
export function createErrorResponse(message, ephemeral = true) {
  return createResponse(message, ephemeral);
}

/**
 * Create a success response
 * @param {string} message - Success message
 * @param {boolean} ephemeral - Whether message should be ephemeral (default: false)
 * @param {Array} components - Discord components (buttons, selects, etc.)
 * @returns {Object} - Discord success response
 */
export function createSuccessResponse(message, ephemeral = false, components = []) {
  return createResponse(message, ephemeral, components);
}

/**
 * Add user to Discord thread
 * @param {string} threadId - Thread ID
 * @param {string} userId - User ID to add
 * @returns {Promise<void>}
 */
export async function addUserToThread(threadId, userId) {
  await DiscordRequest(`channels/${threadId}/thread-members/${userId}`, {
    method: 'PUT'
  });
}

/**
 * Create a Discord thread
 * @param {string} channelId - Parent channel ID
 * @param {string} name - Thread name
 * @param {number} autoArchiveDuration - Auto archive duration in minutes
 * @returns {Promise<Object>} - Thread data
 */
export async function createThread(channelId, name, autoArchiveDuration = 1440) {
  try {
    const response = await DiscordRequest(`channels/${channelId}/threads`, {
      method: 'POST',
      body: {
        name,
        type: DISCORD_CONSTANTS.THREAD_TYPE.PUBLIC_THREAD,
        auto_archive_duration: autoArchiveDuration
      }
    });

    if (!response.ok) {
      console.error('Discord thread creation failed:', response.status, response.statusText);
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Thread creation successful:', data);
    
    if (!data || !data.id) {
      console.error('Invalid thread data returned:', data);
      throw new Error('No thread ID returned from Discord API');
    }
    
    return data;
  } catch (error) {
    console.error('Error in createThread:', error);
    throw error;
  }
}

/**
 * Update or delete a Discord message
 * @param {string} applicationId - Application ID
 * @param {string} token - Interaction token
 * @param {string} messageId - Message ID
 * @param {Object} update - Update data (null to delete)
 * @returns {Promise<void>}
 */
export async function updateMessage(applicationId, token, messageId, update = null) {
  const endpoint = `webhooks/${applicationId}/${token}/messages/${messageId}`;
  
  if (update === null) {
    await DiscordRequest(endpoint, { method: 'DELETE' });
  } else {
    await DiscordRequest(endpoint, {
      method: 'PATCH',
      body: update
    });
  }
}

/**
 * Get the parent channel of a thread
 * @param {string} threadId - Thread ID
 * @returns {Promise<string>} - Parent channel ID
 */
export async function getThreadParentChannel(threadId) {
  const response = await DiscordRequest(`channels/${threadId}`);
  const data = await response.json();
  return data.parent_id;
}

/**
 * Post a message to a Discord channel
 * @param {string} channelId - Channel ID
 * @param {string} content - Message content
 * @returns {Promise<void>}
 */
export async function postToChannel(channelId, content) {
  await DiscordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: { content }
  });
}