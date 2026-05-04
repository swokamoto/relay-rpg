import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId,
  getGuildId
} from '../utils/discord.js';
import { 
  validateAdventureDescription,
  validateParticipantCount 
} from '../utils/validation.js';
import { 
  formatParticipantList, 
  getPlayerStatusMessage 
} from '../utils/gameHelpers.js';
import { Hook } from '../models/Hook.js';
import { MESSAGES, EMOJIS } from '../config/constants.js';
import { 
  InteractionResponseType, 
  InteractionResponseFlags, 
  MessageComponentTypes 
} from 'discord-interactions';

/**
 * Handle /post command - Create a new story hook
 */
export async function handlePostCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  const guildId = getGuildId(req);
  const description = req.body.data.options[0].value;

  // Validate description
  const validation = validateAdventureDescription(description);
  if (!validation.valid) {
    return res.send(createErrorResponse(`❌ ${validation.error}`, true));
  }

  // Create new hook
  const hook = new Hook(validation.description, userId, channelId, guildId);
  gameStorage.addHook(hook);

  // Create instant join button for the ephemeral response
  const joinButton = {
    type: 1, // ACTION_ROW
    components: [
      {
        type: 2, // BUTTON
        style: 1, // Primary
        label: 'Join Adventure',
        custom_id: `join_hook_${hook.id}`,
        emoji: {
          name: '⚔️'
        }
      }
    ]
  };

  // Send ephemeral confirmation to poster
  const ephemeralContent = `${EMOJIS.SUCCESS} **Story Hook Posted!**\n\n` +
                          `**Story:** "${hook.description}"\n\n` +
                          `${EMOJIS.LIGHTBULB} *Click below to join your own adventure, or others can find it in the channel!*`;

  // Also create a public hook posting for others
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: `${EMOJIS.ADVENTURE} **New Story Available!**\n\n` +
                `**Story:** "${hook.description}"\n\n` +
                `${EMOJIS.LIGHTBULB} *Join instantly using the button below!*`,
        components: [{
          type: 1, // ACTION_ROW
          components: [{
            type: 2, // BUTTON
            style: 1, // Primary
            label: 'Join Adventure',
            custom_id: `join_hook_${hook.id}`,
            emoji: { name: '⚔️' }
          }, {
            type: 2, // BUTTON  
            style: 2, // Secondary
            label: 'Browse Stories',
            custom_id: 'view_all_hooks',
            emoji: { name: '📋' }
          }]
        }]
      })
    });
  } catch (error) {
    console.error('Error posting public hook message:', error);
  }

  return res.send(createSuccessResponse(ephemeralContent, true, [joinButton]));
}

/**
 * Handle /hooks command - List available story hooks
 */
export async function handleHooksCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const guildId = getGuildId(req);
  const availableHooks = gameStorage.getHookBoard(guildId);

  if (availableHooks.length === 0) {
    return res.send(createSuccessResponse(
      `${EMOJIS.WAITING} **No Stories Available**\n\n` +
      `Be the first to post one! Use \`/post "description"\` to create a story hook.\n\n` +
      `${EMOJIS.LIGHTBULB} *Story descriptions should be engaging and 10-200 characters long.*`,
      true
    ));
  }

  // Filter available hooks (only show ones that can accept participants, limit to 5)
  const displayHooks = availableHooks
    .filter(hook => hook.canAcceptParticipants())
    .slice(0, 5);

  if (displayHooks.length === 0) {
    return res.send(createSuccessResponse(
      `${EMOJIS.WAITING} **No Open Stories**\n\n` +
      `All current stories are in progress or completed.\n` +
      `Use \`/post "description"\` to create a new story!`,
      true
    ));
  }

  let content = `${EMOJIS.ADVENTURE} **Available Stories** (${displayHooks.length})\n\n`;
  const components = [];

  displayHooks.forEach((hook, index) => {
    content += `**${index + 1}.** ${hook.getDisplayText()}\n\n`;
    
    // Create individual action row for each hook's button
    components.push({
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 1, // Primary
          label: `Join "${hook.description.substring(0, 20)}${hook.description.length > 20 ? '...' : ''}"`,
          custom_id: `join_hook_${hook.id}`,
          emoji: {
            name: '⚔️'
          }
        }
      ]
    });
  });

  return res.send(createSuccessResponse(content, true, components)); // Make ephemeral
}