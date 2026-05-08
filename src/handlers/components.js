import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId,
  getGuildId,
  createThread,
  addUserToThread
} from '../utils/discord.js';
import {
  truncateForThreadName
} from '../utils/gameHelpers.js';
import { config } from '../config/config.js';
import { MESSAGES, EMOJIS, GAME_CONSTANTS } from '../config/constants.js';

export async function handleHookJoinButton(req, res, gameStorage, componentId) {
  const hookId = componentId.replace('join_hook_', '');
  const hook = gameStorage.findHook(hookId);
  
  if (!hook) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.HOOK_NOT_AVAILABLE, true));
  }
  
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  const guildId = getGuildId(req);
  
  // Check if user is already participating in any hook
  const activeHook = gameStorage.getUserActiveHook(userId, guildId);
  if (activeHook && activeHook.id !== hookId) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Already in an Adventure!**\n\n` +
      `You're already part of: "${activeHook.description}"\n\n` +
      `Complete or leave your current adventure before joining another.`,
      true
    ));
  }
  
  // Check if user has a complete character
  const hasCompleteCharacter = gameStorage.hasCompleteCharacter(userId);
  if (!hasCompleteCharacter) {
    const player = gameStorage.getPlayer(userId);
    const missing = [];
    
    if (!player) {
      missing.push('📚 `/name`', '📿 `/conviction`', '⚔️ `/talent`', '🎭 `/quirk`');
    } else {
      if (!player.characterName || player.characterName.trim().length === 0) {
        missing.push('📚 `/name`');
      }
      const sheet = player.getCharacterSheet();
      if (!sheet.conviction) missing.push('📿 `/conviction`');
      if (!sheet.talent) missing.push('⚔️ `/talent`');
      if (!sheet.quirk) missing.push('🎭 `/quirk`');
    }
    
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Character Required!**\n\n` +
      `You need to complete your character before joining adventures.\n\n` +
      `**Missing:** ${missing.join(', ')}\n\n` +
      `*These commands work in any channel and create your permanent character!*`,
      true
    ));
  }
  
  // Check if already joined - if so, redirect to existing thread
  if (hook.participants.includes(userId)) {
    if (hook.threadId) {
      return res.send(createSuccessResponse(
        `${EMOJIS.ADVENTURE} **Welcome back to your adventure!**\n\n` +
        `You're already part of "${hook.description}"\n\n` +
        `Continue your adventure in <#${hook.threadId}>! 🎲`,
        true
      ));
    } else {
      // User is in hook but no thread yet - handle gracefully
      return res.send(createErrorResponse(
        `❌ You're already part of this story, but the thread hasn't been created yet. Please wait for more players to join.`,
        true
      ));
    }
  }
  
  // Add user to hook
  const addResult = hook.addParticipant(userId);
  if (!addResult.success) {
    return res.send(createErrorResponse(`❌ ${addResult.error}`, true));
  }
  
  // Create or find existing thread
  let threadId = hook.threadId;
  
  try {
    if (!threadId) {
      // Create new Discord thread
      const threadName = `${EMOJIS.SWORD} ${truncateForThreadName(hook.description)}`;
      
      const threadData = await createThread(
        channelId, 
        threadName, 
        config.game.threadAutoArchiveDuration
      );
      
      if (!threadData || !threadData.id) {
        throw new Error('Thread creation failed - no thread ID returned');
      }
      
      threadId = threadData.id;
      hook.threadId = threadId;
      
      // Only add the joining user to thread
      await addUserToThread(threadId, userId);
      
    } else {
      // Add new user to existing thread
      await addUserToThread(threadId, userId);
    }
    
    // Don't auto-create adventures - let /begin handle it
    const allParticipants = hook.getAllParticipants();

    // Persist updated hook
    gameStorage.updateHook(hook);
    
    // Simple success response for the user (ephemeral)
    let content = `${EMOJIS.ADVENTURE} **Joined Adventure!**\n\n` +
      `**Story:** "${hook.description}"\n` +
      `**Players:** ${allParticipants.length}\n\n`;
    
    // Add thread link with safety check
    if (threadId) {
      content += `Continue in the adventure thread: <#${threadId}>! 🎲`;
    } else {
      content += `Thread is being created... please check the channel list! 🎲`;
    }
    
    return res.send(createSuccessResponse(content, true));
    
  } catch (error) {
    console.error('Error creating thread:', error);
    
    // Rollback hook participation if thread creation failed
    hook.removeParticipant(userId);
    
    return res.send(createErrorResponse(MESSAGES.ERRORS.THREAD_CREATE_ERROR, true));
  }
}

export async function handleViewAllHooksButton(req, res, gameStorage) {
  const { handleHooksCommand } = await import('./hookCommands.js');
  return await handleHooksCommand(req, res, gameStorage);
}

export async function handleComponents(req, res, gameState) {
  const { data } = req.body;
  const componentId = data.custom_id;

  try {
    if (componentId.startsWith('join_hook_')) {
      return await handleHookJoinButton(req, res, gameState, componentId);
    }
    else if (componentId === 'view_all_hooks') {
      return await handleViewAllHooksButton(req, res, gameState);
    }
    else {
      console.warn('Unknown component ID:', componentId);
      return res.status(400).json({ error: 'unknown component' });
    }
  } catch (error) {
    console.error('Error handling component:', error);
    return res.send(createErrorResponse(
      '❌ An error occurred while processing your interaction. Please try again.',
      true
    ));
  }
}