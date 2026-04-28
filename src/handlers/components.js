import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId,
  createThread,
  addUserToThread,
  updateMessage
} from '../utils/discord.js';
import { 
  formatMessage, 
  formatParticipantList, 
  getPlayerStatusMessage,
  truncateForThreadName
} from '../utils/gameHelpers.js';
import { config } from '../config/config.js';
import { MESSAGES, EMOJIS, GAME_CONSTANTS } from '../config/constants.js';

/**
 * Handle job join button clicks
 */
export async function handleJobJoinButton(req, res, gameStorage, componentId) {
  const jobId = componentId.replace('join_job_', '');
  const job = gameStorage.findJob(jobId);
  
  if (!job) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.JOB_NOT_AVAILABLE, true));
  }
  
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Check if user is already participating in any job
  const activeJob = gameStorage.getUserActiveJob(userId);
  if (activeJob && activeJob.id !== jobId) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Already in an Adventure!**\n\n` +
      `You're already part of: "${activeJob.description}"\n\n` +
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
      missing.push('📿 `/conviction`', '⚔️ `/talent`', '🎭 `/quirk`');
    } else {
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
  if (job.isUserInvolved(userId)) {
    const activeThreads = gameStorage.getActiveThreads();
    const threadInfo = activeThreads[jobId];
    
    if (threadInfo) {
      // User is already in job and thread exists - redirect them
      return res.send(createSuccessResponse(
        `${EMOJIS.ADVENTURE} **Welcome back to your adventure!**\n\n` +
        `You're already part of "${job.description}"\n\n` +
        `Continue your adventure in <#${threadInfo.threadId}>! 🎲`,
        true
      ));
    } else {
      // User is in job but no thread yet - this shouldn't happen, but handle gracefully
      return res.send(createErrorResponse(
        `❌ You're already part of this adventure, but the thread hasn't been created yet. Please wait for more players to join.`,
        true
      ));
    }
  }
  
  // Add user to job
  const addResult = job.addParticipant(userId);
  if (!addResult.success) {
    return res.send(createErrorResponse(`❌ ${addResult.error}`, true));
  }
  
  // Create or find existing thread
  const activeThreads = gameStorage.getActiveThreads();
  let threadInfo = activeThreads[jobId];
  
  try {
    if (!threadInfo) {
      // Create new Discord thread
      const threadName = `${EMOJIS.SWORD} ${truncateForThreadName(job.description)}`;
      
      const threadData = await createThread(
        channelId, 
        threadName, 
        config.game.threadAutoArchiveDuration
      );
      
      // Store thread info
      threadInfo = {
        jobId: jobId,
        threadId: threadData.id,
        participants: [job.postedBy, userId],
        created: new Date()
      };
      gameStorage.addThread(jobId, threadInfo);
      
      // Add both users to thread
      await addUserToThread(threadData.id, job.postedBy);
      await addUserToThread(threadData.id, userId);
      
    } else {
      // Add new user to existing thread
      threadInfo.participants.push(userId);
      await addUserToThread(threadInfo.threadId, userId);
    }
    
    // Auto-create adventure and try to start if ready
    const allParticipants = job.getAllParticipants();
    let adventure = gameStorage.findAdventureByThread(threadInfo.threadId);
    
    if (!adventure && allParticipants.length >= GAME_CONSTANTS.MIN_PLAYERS) {
      // Create adventure automatically when we have minimum players
      const Adventure = (await import('../models/Adventure.js')).Adventure;
      adventure = new Adventure(jobId, threadInfo.threadId, allParticipants);
      gameStorage.addAdventure(adventure);
      
      // Check if adventure can start immediately (all players have characters)
      const canStart = adventure.canStart(gameStorage);
      if (canStart.can) {
        const startResult = adventure.begin(gameStorage);
        if (startResult.success) {
          // Adventure started immediately!
          const content = `🎉 **Adventure Started!**\n\n` +
            `**Quest:** "${job.description}"\n` +
            `**Party:** <@${allParticipants.join('>, <@')}>\n\n` +
            `⚔️ **Scene 1 begins!** ${startResult.message}\n\n` +
            `🎲 **Commands:** \`/roll\` or \`/roll trait:conviction\` etc.`;
          
          return res.send(createSuccessResponse(content, true));
        }
      }
    }
    
    // Default response for when adventure isn't started yet
    const readyStatus = job.isReadyToStart();
    const statusMessage = getPlayerStatusMessage(readyStatus.totalParticipants, GAME_CONSTANTS.MIN_PLAYERS);
    
    let content = formatMessage(MESSAGES.SUCCESS.JOINED_ADVENTURE, {
      description: job.description,
      count: readyStatus.totalParticipants,
      participants: formatParticipantList(job.getAllParticipants()),
      threadId: threadInfo.threadId,
      status: statusMessage
    });
    
    // Add character readiness info if we have enough players but not all have characters
    if (allParticipants.length >= GAME_CONSTANTS.MIN_PLAYERS && !adventure) {
      const incompleteCount = allParticipants.filter(userId => 
        !gameStorage.hasCompleteCharacter(userId)
      ).length;
      
      if (incompleteCount > 0) {
        content += `\n\n⏳ **Waiting for character creation:** ${incompleteCount} player(s) need to complete their character using \`/conviction\`, \`/talent\`, and \`/quirk\` commands.`;
        content += `\n\n✨ *Adventure will start automatically when all players have complete characters!*`;
      }
    } else if (allParticipants.length < GAME_CONSTANTS.MIN_PLAYERS) {
      const needed = GAME_CONSTANTS.MIN_PLAYERS - allParticipants.length;
      content += `\n\n👥 **Need ${needed} more player(s)** to start the adventure.`;
    }
    
    return res.send(createSuccessResponse(content, true));
    
  } catch (error) {
    console.error('Error creating thread:', error);
    
    // Rollback job participation if thread creation failed
    job.removeParticipant(userId);
    
    return res.send(createErrorResponse(MESSAGES.ERRORS.THREAD_CREATE_ERROR, true));
  }
}

/**
 * Handle view all jobs button click
 */
export async function handleViewAllJobsButton(req, res, gameStorage) {
  // Reuse the existing jobs command logic
  const { handleJobsCommand } = await import('./jobCommands.js');
  return await handleJobsCommand(req, res, gameStorage);
}

/**
 * Main component handler - Routes component interactions to appropriate handlers
 */
export async function handleComponents(req, res, gameState) {
  const { data } = req.body;
  const componentId = data.custom_id;

  try {
    if (componentId.startsWith('join_job_')) {
      return await handleJobJoinButton(req, res, gameState, componentId);
    }
    else if (componentId === 'view_all_jobs') {
      return await handleViewAllJobsButton(req, res, gameState);
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