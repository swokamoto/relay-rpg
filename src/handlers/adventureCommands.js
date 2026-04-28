import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId 
} from '../utils/discord.js';
import { formatMessage, formatParticipantList } from '../utils/gameHelpers.js';
import { Adventure } from '../models/Adventure.js';
import { MESSAGES, EMOJIS, ADVENTURE_PHASES, SETUP_PHASES, GAME_CONSTANTS } from '../config/constants.js';

/**
 * Handle /transition command - Bridge scenes with but/therefore statements
 */
export async function handleTransitionCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Find thread info
  const activeThreads = gameStorage.getActiveThreads();
  const threadInfo = Object.values(activeThreads).find(t => t.threadId === channelId);
  
  if (!threadInfo) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Not an Adventure Thread**\n\n` +
      `This command only works in adventure threads.\n` +
      `Use \`/jobs\` in the main channel to find adventures to join!`,
      true
    ));
  }
  
  // Find the adventure
  let adventure = gameStorage.findAdventureByThread(channelId);
  if (!adventure) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} No active adventure found in this thread!`, true));
  }

  // Get options from command
  const options = req.body.data.options || [];
  const transitionOption = options.find(opt => opt.name === 'statement');
  
  if (!transitionOption) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Please provide a transition statement!`, true));
  }
  
  const transitionStatement = transitionOption.value;
  
  // Handle the transition
  const result = adventure.handleSceneTransition(userId, transitionStatement);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }

  // Build response message
  let content = `🔄 **Scene Transition** by <@${userId}>\n\n`;
  content += `**Scene Result:** ${result.transition.sceneResult.toUpperCase()}\n`;
  content += `*"${result.transition.transition}"*\n\n`;
  
  // Show advancement result
  if (result.sceneAdvancement.adventureComplete) {
    content += `${result.sceneAdvancement.result === 'success' ? '🏆' : '💀'} **Adventure ${result.sceneAdvancement.result.toUpperCase()}!**\n`;
    content += `${result.sceneAdvancement.message}`;
  } else if (result.sceneAdvancement.finalScene) {
    content += `⚔️ **${result.sceneAdvancement.message}**\n\n`;
    content += `🎲 *Ready for the final challenge! Use \`/turn\` to continue the story.*`;
  } else {
    content += `🎬 **${result.sceneAdvancement.message}**\n\n`;
    content += `🎭 *New scene begins! Any player can start with \`/turn\`.*`;
  }

  return res.send(createSuccessResponse(content));
}

/**
 * Handle /turn command - Narrative turn with resolution and action
 */
export async function handleTurnCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Find thread info
  const activeThreads = gameStorage.getActiveThreads();
  const threadInfo = Object.values(activeThreads).find(t => t.threadId === channelId);
  
  if (!threadInfo) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Not an Adventure Thread**\n\n` +
      `This command only works in adventure threads.\n` +
      `Use \`/jobs\` in the main channel to find adventures to join!`,
      true
    ));
  }
  
  // Find the adventure
  let adventure = gameStorage.findAdventureByThread(channelId);
  if (!adventure) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} No active adventure found in this thread!`, true));
  }

  if (adventure.phase !== ADVENTURE_PHASES.PLAYING) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Adventure must be active to take turns! Use \`/begin\` to start.`, true));
  }

  // Get narrative from command options
  const narrative = req.body.data.options[0].value;
  
  // Check for optional trait
  let traitType = null;
  if (req.body.data.options.length > 1) {
    traitType = req.body.data.options[1].value;
  }

  // Take the turn
  const result = adventure.takeTurn(userId, narrative, traitType, gameStorage);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }

  // Build response message
  let content = `🎭 **<@${userId}> Takes Action**\n\n`;
  content += `*"${result.turn.narrative}"*\n\n`;
  
  // Show roll result
  content += `🎲 **Roll:** ${result.turn.roll.dice[0]} + ${result.turn.roll.dice[1]}`;
  if (result.turn.roll.bonus > 0) {
    content += ` + ${result.turn.roll.bonus} (${result.turn.roll.traitUsed.type})`;
  }
  content += ` = **${result.turn.roll.total}**\n\n`;
  
  // Show outcome
  if (result.turn.roll.outcome === 'success') {
    content += `✅ **SUCCESS!** (9+)`;
  } else if (result.turn.roll.outcome === 'failure') {
    content += `❌ **FAILURE!** (5-)`;
  } else {
    content += `🤔 **PARTIAL SUCCESS** (6-8)`;
  }
  
  // Add trait usage info
  if (result.turn.roll.traitUsed) {
    content += `\n💪 **Used ${result.turn.roll.traitUsed.type}:** "${result.turn.roll.traitUsed.description}"`;
  }
  
  // Show scene status
  content += `\n\n**Scene ${result.sceneStatus.scene}:** ${result.sceneStatus.successes} successes, ${result.sceneStatus.failures} failures`;
  
  // Check if scene is complete
  if (result.sceneStatus.complete) {
    // Scene completed - show transition prompt instead of auto-advancing
    const transitionPrompt = adventure.getTransitionPrompt(adventure.narrative.pendingTransition);
    content += `\n\n${transitionPrompt}`;
  } else {
    // Add next player prompt
    content += `\n\n${result.nextPlayerPrompt}`;
  }

  return res.send(createSuccessResponse(content));
}

/**
 * Handle /begin command - Start or check adventure status
 */
export async function handleBeginCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Find thread info
  const activeThreads = gameStorage.getActiveThreads();
  const threadInfo = Object.values(activeThreads).find(t => t.threadId === channelId);
  
  if (!threadInfo) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Not an Adventure Thread**\n\n` +
      `This command only works in adventure threads.\n` +
      `Use \`/jobs\` in the main channel to find adventures to join!`,
      true
    ));
  }
  
  // Find the job
  const job = gameStorage.findJob(threadInfo.jobId);
  if (!job) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Adventure job not found!`, true));
  }
  
  // Check if user is a participant
  if (!job.isUserInvolved(userId)) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.NOT_PARTICIPANT, true));
  }
  
  const allParticipants = job.getAllParticipants();
  
  // Check minimum players
  if (allParticipants.length < GAME_CONSTANTS.MIN_PLAYERS) {
    const needed = GAME_CONSTANTS.MIN_PLAYERS - allParticipants.length;
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Need More Players**\n\n` +
      `Need ${needed} more player(s) to start. Current: ${allParticipants.length}/${GAME_CONSTANTS.MIN_PLAYERS}\n\n` +
      `*Ask friends to join from the main channel using \`/jobs\`!*`,
      true
    ));
  }
  
  // Find or create adventure
  let adventure = gameStorage.findAdventureByThread(channelId);
  if (!adventure) {
    const Adventure = (await import('../models/Adventure.js')).Adventure;
    adventure = new Adventure(threadInfo.jobId, channelId, allParticipants);
    gameStorage.addAdventure(adventure);
  }
  
  // Check if adventure can be started
  const canStart = adventure.canStart(gameStorage);
  if (!canStart.can) {
    if (canStart.incompleteCharacters && canStart.incompleteCharacters.length > 0) {
      let content = `${EMOJIS.ERROR} ${canStart.reason}\n\n`;
      content += `**Players needing character creation:**\n`;
      canStart.incompleteCharacters.forEach(userId => {
        const player = gameStorage.getPlayer(userId);
        const missing = [];
        if (!player) {
          missing.push('📿 conviction', '⚔️ talent', '🎭 quirk');
        } else {
          const sheet = player.getCharacterSheet();
          if (!sheet.conviction) missing.push('📿 conviction');
          if (!sheet.talent) missing.push('⚔️ talent');
          if (!sheet.quirk) missing.push('🎭 quirk');
        }
        content += `<@${userId}>: needs ${missing.join(', ')}\n`;
      });
      content += `\n*Use \`/conviction\`, \`/talent\`, and \`/quirk\` in any channel to create your character!*`;
      
      return res.send(createErrorResponse(content, true));
    } else {
      return res.send(createErrorResponse(`${EMOJIS.ERROR} ${canStart.reason}`, true));
    }
  }
  
  // Begin the adventure
  const result = adventure.begin(gameStorage);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }
  
  return res.send(createSuccessResponse(`⚔️ **Adventure Started!**\n\n${result.message}`));
}

/**
 * Handle /status command - Show adventure status
 */
export async function handleStatusCommand(req, res, gameStorage) {
  const channelId = getChannelId(req);
  
  // Find active adventure for this thread
  const activeGames = gameStorage.getActiveAdventures();
  const adventure = Object.values(activeGames).find(game => game.threadId === channelId);
  
  if (!adventure) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.NO_ADVENTURE, true));
  }
  
  if (adventure.phase === ADVENTURE_PHASES.WAITING) {
    let statusText = `${EMOJIS.READY} **Adventure Ready to Begin!**\n\n`;
    
    // Check character readiness
    let readyCount = 0;
    let participantStatus = '**Participant Status:**\n';
    
    adventure.participants.forEach(playerId => {
      const hasComplete = gameStorage.hasCompleteCharacter(playerId);
      if (hasComplete) {
        readyCount++;
        participantStatus += `<@${playerId}>: ✅ **Character Ready**\n`;
      } else {
        const player = gameStorage.getPlayer(playerId);
        const missing = [];
        if (!player) {
          missing.push('📿 conviction', '⚔️ talent', '🎭 quirk');
        } else {
          const sheet = player.getCharacterSheet();
          if (!sheet.conviction) missing.push('📿 conviction');
          if (!sheet.talent) missing.push('⚔️ talent'); 
          if (!sheet.quirk) missing.push('🎭 quirk');
        }
        participantStatus += `<@${playerId}>: ❌ **Needs:** ${missing.join(', ')}\n`;
      }
    });
    
    statusText += `**Ready:** ${readyCount}/${adventure.participants.length} players\n\n`;
    statusText += participantStatus;
    
    if (readyCount === adventure.participants.length && adventure.participants.length >= GAME_CONSTANTS.MIN_PLAYERS) {
      statusText += `\n✅ **All participants ready!** Use \`/begin\` to start the adventure.`;
    } else if (readyCount < adventure.participants.length) {
      statusText += `\n💡 **Waiting for character creation.** Players can use \`/conviction\`, \`/talent\`, and \`/quirk\` commands in any channel.`;
    }
    
    return res.send(createSuccessResponse(statusText));
    
  } else if (adventure.phase === ADVENTURE_PHASES.PLAYING) {
    // Adventure in progress
    const status = adventure.getStatus();
    let content = `🎲 **Adventure in Progress**\n\n`;
    content += `**Scene:** ${status.scene}/${status.maxScenes}\n`;
    content += `**Current Scene:** ${status.sceneSuccesses} successes, ${status.sceneFailures} failures\n`;
    content += `**Failed Scenes:** ${status.failedScenes}\n\n`;
    
    // Show trait usage for participants
    content += `**Trait Usage This Adventure:**\n`;
    adventure.participants.forEach(playerId => {
      const usage = adventure.getPlayerTraitUsage(playerId);
      const usedTraits = Object.entries(usage)
        .filter(([trait, used]) => used)
        .map(([trait, used]) => trait);
      
      content += `<@${playerId}>: ${usedTraits.length}/3 traits used`;
      if (usedTraits.length > 0) {
        content += ` (${usedTraits.join(', ')})`;
      }
      content += `\n`;
    });
    
    content += `\n🎲 **Commands:** \`/roll\` or \`/roll trait:conviction\` etc.`;
    
    return res.send(createSuccessResponse(content));
    
  } else if (adventure.phase === ADVENTURE_PHASES.COMPLETED) {
    return res.send(createSuccessResponse('🎭 **Adventure Complete!**\n\nThis adventure has ended.'));
    
  } else {
    return res.send(createSuccessResponse('🤷 **Unknown Status**\n\nAdventure is in an unknown state.'));
  }
}

/**
 * Handle /roll command - Roll dice with optional trait bonus
 */
export async function handleRollCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Get the optional trait parameter
  const traitType = req.body.data.options?.find(option => option.name === 'trait')?.value;
  
  // Find active adventure for this thread
  const activeGames = gameStorage.getActiveAdventures();
  const adventure = Object.values(activeGames).find(game => game.threadId === channelId);
  
  if (!adventure) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.NO_ADVENTURE, true));
  }
  
  if (!adventure.isParticipant(userId)) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.NOT_PARTICIPANT, true));
  }
  
  if (adventure.phase !== ADVENTURE_PHASES.PLAYING) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Adventure must be in playing phase to roll dice! Current phase: ${adventure.phase}`, true));
  }
  
  // Make the roll
  const result = adventure.rollDice(userId, traitType, gameStorage);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }
  
  // Format the result message
  let content = `🎲 **<@${userId}> rolls:**\n`;
  content += `**Dice:** ${result.dice[0]} + ${result.dice[1]} = ${result.dice[0] + result.dice[1]}`;
  
  if (result.bonus > 0) {
    content += `\n**Trait Bonus:** +${result.bonus} (${result.traitUsed.type}: "${result.traitUsed.description}")`;
    content += `\n**Total:** ${result.total}`;
  }
  
  // Add outcome
  if (result.outcome === 'success') {
    content += `\n\n✅ **SUCCESS!** (9+)`;
  } else if (result.outcome === 'failure') {
    content += `\n\n❌ **FAILURE!** (5-)`;
  } else {
    content += `\n\n🤔 **PARTIAL SUCCESS** (6-8)`;
  }
  
  // Add scene status
  content += `\n\n**Scene ${adventure.scene}:** ${result.scene.successes} successes, ${result.scene.failures} failures`;
  
  // Check if scene is complete
  if (result.scene.complete) {
    if (result.scene.result === 'success') {
      content += `\n\n🎉 **Scene ${adventure.scene} SUCCEEDED!** (3+ successes)`;
    } else {
      content += `\n\n💥 **Scene ${adventure.scene} FAILED!** (3+ failures)`;
    }
    
    // Advance scene automatically
    const advanceResult = adventure.advanceScene(result.scene.result === 'success');
    
    if (advanceResult.adventureComplete) {
      content += `\n\n${advanceResult.result === 'success' ? '🏆' : '💀'} **Adventure ${advanceResult.result.toUpperCase()}!**`;
      content += `\n${advanceResult.message}`;
    } else if (advanceResult.finalScene) {
      content += `\n\n⚔️ **${advanceResult.message}**`;
    } else {
      content += `\n\n🎬 **${advanceResult.message}**`;
    }
  }
  
  return res.send(createSuccessResponse(content));
}