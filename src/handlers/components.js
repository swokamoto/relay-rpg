import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId,
  createThread,
  addUserToThread
} from '../utils/discord.js';
import { 
  formatParticipantList, 
  getPlayerStatusMessage,
  truncateForThreadName
} from '../utils/gameHelpers.js';
import { config } from '../config/config.js';
import { MESSAGES, EMOJIS, GAME_CONSTANTS } from '../config/constants.js';
import process from 'process';

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
  if (job.participants.includes(userId)) {
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
      
      console.log('Thread created:', threadData); // Debug log
      
      if (!threadData || !threadData.id) {
        throw new Error('Thread creation failed - no thread ID returned');
      }
      
      // Store thread info - only include actual participants
      threadInfo = {
        jobId: jobId,
        threadId: threadData.id,
        participants: [userId], // Only the joining user
        created: new Date()
      };
      gameStorage.addThread(jobId, threadInfo);
      
      console.log('Stored thread info:', threadInfo); // Debug log
      
      // Only add the joining user to thread
      await addUserToThread(threadData.id, userId);
      
    } else {
      // Add new user to existing thread
      threadInfo.participants.push(userId);
      await addUserToThread(threadInfo.threadId, userId);
    }
    
    // Don't auto-create adventures - let /begin handle it
    const allParticipants = job.getAllParticipants();
    
    // Simple success response for the user (ephemeral)
    let content = `${EMOJIS.ADVENTURE} **Joined Adventure!**\n\n` +
      `**Story:** "${job.description}"\n` +
      `**Players:** ${allParticipants.length}\n\n`;
    
    // Add thread link with safety check
    if (threadInfo && threadInfo.threadId) {
      content += `Continue in the adventure thread: <#${threadInfo.threadId}>! 🎲`;
    } else {
      content += `Thread is being created... please check the channel list! 🎲`;
      console.error('Thread info missing or invalid:', threadInfo);
    }
    
    return res.send(createSuccessResponse(content, true)); // Always ephemeral
    
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