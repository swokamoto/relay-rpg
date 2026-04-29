import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId,
  getThreadParentChannel,
  postToChannel
} from '../utils/discord.js';
import { formatParticipantList } from '../utils/gameHelpers.js';
import { Adventure } from '../models/Adventure.js';
import { gameStorage } from '../storage/gameState.js';
import { MESSAGES, EMOJIS, ADVENTURE_PHASES, SETUP_PHASES, GAME_CONSTANTS, EPILOGUE_TYPES } from '../config/constants.js';

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
  let result;
  try {
    result = adventure.handleSceneTransition(userId, transitionStatement);
  } catch (error) {
    console.error('Exception in handleSceneTransition:', error);
    console.error('Adventure details:', {
      id: adventure.id,
      scene: adventure.scene,
      phase: adventure.phase,
      participants: adventure.participants
    });
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} An error occurred during scene transition: ${error.message}`, 
      true
    ));
  }
  
  if (!result.success) {
    console.error('Scene transition failed:', result.error);
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }

  // Build response message
  let content = `🔄 **Scene Transition** by <@${userId}>\n\n`;
  content += `**Scene Result:** ${result.transition.sceneResult.toUpperCase()}\n`;
  content += `**"${result.transition.transition}"**\n\n`;
  
  // Show advancement result
  if (result.sceneAdvancement.adventureComplete) {
    content += `${result.sceneAdvancement.result === 'success' ? '🏆' : '💀'} **Story ${result.sceneAdvancement.result.toUpperCase()}!**\n`;
    content += `${result.sceneAdvancement.message}\n\n`;
    
    // Check if this is a final scene completion requiring quest host outcome
    if (result.sceneAdvancement.needsQuestHostOutcome) {
      // Auto-designate the completing player as quest host
      const questHostResult = adventure.beginEpilogue(userId);
      if (questHostResult.success) {
        content += `🎭 **Host Designated:** <@${userId}>\n\n`;
        content += `📜 **As the Host, describe the final outcome of this story using** \`/finale\`\n\n`;
        content += `*Once the finale is posted, all players can share their epilogue responses.*`;
      }
    }
  } else if (result.sceneAdvancement.finalScene) {
    content += `${result.sceneAdvancement.actTransition ? result.sceneAdvancement.actTransition + '\n\n' : ''}`;
    content += `⚔️ **${result.sceneAdvancement.message}**\n\n`;
    content += `🎲 *Ready for the final challenge! Each player may declare 1 Truth about this scene using \`/truth\`. Use \`/turn\` to continue the story.*`;
  } else {
    content += `${result.sceneAdvancement.actTransition ? result.sceneAdvancement.actTransition + '\n\n' : ''}`;
    content += `🎬 **${result.sceneAdvancement.message}**\n\n`;
    content += `� *Use \`/truth\` to add scene details, \`/turn\` to take actions.*`;
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
    return res.send(createErrorResponse(`${EMOJIS.ERROR} No active story found in this thread!`, true));
  }

  if (adventure.phase !== ADVENTURE_PHASES.PLAYING) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Story must be active to take turns! Use \`/begin\` to start.`, true));
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

  // Get the player to show character name
  const player = gameStorage.getPlayer(userId);
  const characterName = player ? player.getCharacterName() : 'Unknown Character';

  // Build response message - Show character name and narrative
  let content = `**${characterName}**: **"${result.turn.narrative}"**\n\n`;
  
  // Show roll result concisely
  content += `🎲 ${result.turn.roll.dice[0]}+${result.turn.roll.dice[1]}`;
  if (result.turn.roll.bonus > 0) {
    content += `+${result.turn.roll.bonus}`;
  }
  content += ` = **${result.turn.roll.total}** `;
  
  // Show outcome inline
  if (result.turn.roll.outcome === 'success') {
    content += `✅ **SUCCESS**`;
  } else if (result.turn.roll.outcome === 'failure') {
    content += `❌ **FAILURE**`;
  } else {
    content += `🤔 **PARTIAL**`;
  }
  
  // Show trait used inline if applicable
  if (result.turn.roll.traitUsed) {
    content += ` (${result.turn.roll.traitUsed.type}: "${result.turn.roll.traitUsed.description}")`;
  }
  
  // Show scene status inline
  const successEmojis = '✅'.repeat(result.sceneStatus.successes);
  const failureEmojis = '❌'.repeat(result.sceneStatus.failures);
  content += ` | Scene ${result.sceneStatus.scene}: ${successEmojis}${failureEmojis}`;
  
  // Check if scene is complete
  if (result.sceneStatus.complete) {
    // If it's the final scene, skip transition prompt and go directly to finale
    if (result.sceneStatus.scene >= GAME_CONSTANTS.MAX_SCENES) { // Final scene
      // Final scene completed - handle adventure completion directly
      const advancementResult = adventure.advanceScene(result.sceneStatus.result === 'success');
      
      if (advancementResult.adventureComplete) {
        content += `\n\n${advancementResult.result === 'success' ? '🏆' : '💀'} **Story ${advancementResult.result.toUpperCase()}!**\n`;
        content += `${advancementResult.message}\n\n`;
        
        if (advancementResult.needsQuestHostOutcome) {
          const questHostResult = adventure.beginEpilogue(userId);
          if (questHostResult.success) {
            content += `🎭 **Host Designated:** <@${userId}>\n\n`;
            content += `📜 **As the Host, describe the final outcome of this story using** \`/finale\`\n\n`;
            content += `*Once the finale is posted, all players can share their epilogue responses.*`;
          }
        }
      }
    } else {
      // Regular scene - show transition prompt
      const transitionPrompt = adventure.getTransitionPrompt(adventure.narrative.pendingTransition);
      content += `\n\n${transitionPrompt}`;
    }
  }

  return res.send(createSuccessResponse(content));
}

/**
 * Handle /begin command - Start or check adventure status
 */
export async function handleBeginCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Get scene description from command options
  const options = req.body.data.options || [];
  const sceneOption = options.find(opt => opt.name === 'scene');
  
  if (!sceneOption || !sceneOption.value.trim()) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Scene Description Required**\n\n` +
      `Please provide an opening scene description.\n` +
      `Example: \`/begin "The ancient tower looms before you, its doors sealed with strange runes..."\``,
      true
    ));
  }
  
  const sceneDescription = sceneOption.value.trim();
  
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
  
  // Check if user can start the adventure
  // Job poster can start it, but only actual participants are included in the adventure
  const isJobPoster = userId === job.postedBy;
  const isParticipant = job.getAllParticipants().includes(userId);
  
  if (!isJobPoster && !isParticipant) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.NOT_PARTICIPANT, true));
  }
  
  const allParticipants = job.getAllParticipants();
  
  // If job poster is also a participant, they should be included
  // If job poster is not a participant, they can start but won't be in the adventure
  let adventureParticipants = allParticipants;
  if (isJobPoster && !isParticipant) {
    // Job poster wants to start but isn't a participant - allow it, but don't include them
    // This is valid - they can start the adventure for others
  }
  
  // Check minimum players based on actual participants, not including poster unless they joined
  if (adventureParticipants.length < GAME_CONSTANTS.MIN_PLAYERS) {
    const needed = GAME_CONSTANTS.MIN_PLAYERS - adventureParticipants.length;
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Need More Players**\n\n` +
      `Need ${needed} more player(s) to start. Current: ${adventureParticipants.length}/${GAME_CONSTANTS.MIN_PLAYERS}\n\n` +
      `*Ask friends to join from the main channel using \`/jobs\`!*`,
      true
    ));
  }
  
  // Find or create adventure
  let adventure = gameStorage.findAdventureByThread(channelId);
  if (adventure && adventure.locked) {
    // Adventure is locked - check if user is already a participant
    if (!adventure.isParticipant(userId)) {
      return res.send(createErrorResponse(
        `${EMOJIS.ERROR} **Adventure Already Started**\n\n` +
        `This adventure has already begun and is locked to its original participants.\n` +
        `You cannot join an adventure that's already in progress.`,
        true
      ));
    }
    
    // If adventure is already started, just show status
    if (adventure.phase === ADVENTURE_PHASES.PLAYING) {
      return res.send(createErrorResponse(
        `${EMOJIS.ERROR} **Adventure Already Started**\n\n` +
        `This adventure is already in progress! Use \`/status\` to see current state.`,
        true
      ));
    }
  }
  
  if (!adventure) {
    adventure = new Adventure(threadInfo.jobId, channelId, adventureParticipants);
    gameStorage.addAdventure(adventure);
  } else if (!adventure.locked) {
    // Update adventure participants to match current job participants
    // This ensures players who joined after adventure creation are included
    // But only if the adventure hasn't started yet (not locked)
    adventure.participants = adventureParticipants;
    // No additional storage update needed - adventure object is modified in-place
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
          missing.push('� name', '📿 conviction', '⚔️ talent', '🎭 quirk');
        } else {
          if (!player.characterName) missing.push('📚 name');
          const sheet = player.getCharacterSheet();
          if (!sheet.conviction) missing.push('📿 conviction');
          if (!sheet.talent) missing.push('⚔️ talent');
          if (!sheet.quirk) missing.push('🎭 quirk');
        }
        content += `<@${userId}>: needs ${missing.join(', ')}\n`;
      });
      content += `\n*Use \`/name\`, \`/conviction\`, \`/talent\`, and \`/quirk\` in any channel to create your character!*`;
      
      return res.send(createErrorResponse(content, true));
    } else {
      return res.send(createErrorResponse(`${EMOJIS.ERROR} ${canStart.reason}`, true));
    }
  }
  
  // Begin the adventure
  const result = adventure.begin(gameStorage, sceneDescription);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }
  
  // Remove job from job board since adventure has started
  try {
    gameStorage.removeJob(threadInfo.jobId);
    console.log(`Job ${threadInfo.jobId} removed from job board - adventure started`);
  } catch (error) {
    console.error('Failed to remove job from board:', error);
    // Don't fail the adventure start if job removal fails
  }
  
  return res.send(createSuccessResponse(
    `⚔️ **Story Started!**\n\n` +
    `**Scene 1:** *"${result.openingScene}"*\n\n` +
    `🌍 **Scene Setup Phase** - Each player may declare **1 Truth** about this scene using \`/truth\`. Begin taking \`/turn\` when ready.\n\n` +
    `💡 *Truths add details to the environment, situation, or scene that become part of the story.*`
  ));
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
          missing.push('� name', '📿 conviction', '⚔️ talent', '🎭 quirk');
        } else {
          if (!player.characterName) missing.push('📚 name');
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
    
    return res.send(createSuccessResponse(statusText, true)); // Make ephemeral
    
  } else if (adventure.phase === ADVENTURE_PHASES.PLAYING) {
    // Adventure in progress
    const status = adventure.getStatus();
    let content = `🎲 **Story in Progress**\n\n`;
    content += `**Scene:** ${status.scene}/${status.maxScenes}\n`;
    
    // Create emoji string for current scene results
    const successEmojis = '✅'.repeat(status.sceneSuccesses);
    const failureEmojis = '❌'.repeat(status.sceneFailures);
    content += `**Current Scene:** ${successEmojis}${failureEmojis}\n`;
    
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
    
    content += `\n� **Commands:** Use \`/turn\` to take narrative actions.`;
    
    return res.send(createSuccessResponse(content, true)); // Make ephemeral
    
  } else if (adventure.phase === ADVENTURE_PHASES.COMPLETED) {
    // Check if in epilogue phase
    const epilogueStatus = adventure.getEpilogueStatus();
    
    if (epilogueStatus.active) {
      let content = `📖 **Adventure Complete - Epilogue Phase**\n\n`;
      
      if (epilogueStatus.allComplete) {
        content += `🎊 **All Epilogue Responses Complete!**\n\n`;
        content += `This adventure's chronicle has been fully recorded with community contributions.\n\n`;
        
        // Show all epilogue responses
        content += `**Community Contributions:**\n`;
        epilogueStatus.responses.forEach(response => {
          let typeEmoji;
          switch (response.response.type) {
            case 'character_growth':
              typeEmoji = '📖';
              break;
            case 'unresolved_thread':
              typeEmoji = '🧵';
              break;
            case 'future_hook':
              typeEmoji = '🔮';
              break;
            default:
              typeEmoji = '✨';
          }
          content += `${typeEmoji} <@${response.userId}>: "${response.response.content}"\n`;
        });
      } else {
        content += `**Quest Host:** <@${epilogueStatus.questHost}>\n`;
        content += `**Epilogue Progress:** ${epilogueStatus.completed}/${epilogueStatus.total} responses\n\n`;
        
        if (epilogueStatus.pendingPlayers.length > 0) {
          content += `**Awaiting epilogue responses from:**\n`;
          epilogueStatus.pendingPlayers.forEach(userId => {
            content += `• <@${userId}>\n`;
          });
          content += `\n*Use \`/epilogue\` to share your character's final reflection*`;
        }
      }
      
      return res.send(createSuccessResponse(content, true)); // Make ephemeral
    } else {
      return res.send(createSuccessResponse('🎭 **Adventure Complete!**\n\nThis adventure has ended.', true)); // Make ephemeral
    }
    
  } else {
    return res.send(createSuccessResponse('🤷 **Unknown Status**\n\nAdventure is in an unknown state.', true)); // Make ephemeral
  }
}

/**
 * Handle /finale command - Quest Host describes final adventure outcome
 */
export async function handleFinaleCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Find adventure
  const adventure = gameStorage.findAdventureByThread(channelId);
  if (!adventure) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} No active story found in this thread!`, true));
  }

  // Check if adventure is completed and epilogue phase started
  if (!adventure.epiloguePhase || adventure.questHost !== userId) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} Only the designated Host can provide the finale! ` +
      `The Host is designated when the story completes.`,
      true
    ));
  }

  const options = req.body.data.options || [];
  const outcomeOption = options.find(opt => opt.name === 'outcome');
  
  if (!outcomeOption || !outcomeOption.value.trim()) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Please provide the final outcome description!`, true));
  }
  
  const outcome = outcomeOption.value.trim();
  
  // Store the finale content (don't post to general yet)
  adventure.finaleContent = {
    content: outcome,
    author: userId,
    timestamp: new Date()
  };
  
  // Send response to thread
  let content = `✅ **Finale Recorded!**\n\n`;
  content += `🎭 **FINALE** - *The Story Concludes*\n`;
  content += `**Host:** <@${userId}>\n\n`;
  content += `**"${outcome}"**\n\n`;
  content += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  content += `📖 **Epilogue Phase** \n\n`;
  content += `Each player must now share one final post using \`/epilogue\`: \n\n`;
  content += `📖 **Character Growth** - How did your character change or what did they learn?\n`;
  content += `🧵 **Unresolved Thread** - What question or mystery remains from this story?\n`;
  content += `🔮 **Future Hook** - What new story idea does this inspire?\n\n`;
  content += `*The finale and all epilogues will be posted together to the community once everyone responds!*`;

  return res.send(createSuccessResponse(content));
}

/**
 * Handle /epilogue command - Player epilogue responses
 */
export async function handleEpilogueCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  
  // Find adventure
  const adventure = gameStorage.findAdventureByThread(channelId);
  if (!adventure) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} No active story found in this thread!`, true));
  }

  // Check if adventure is in epilogue phase
  if (!adventure.epiloguePhase) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} Story must be completed before epilogue responses! ` +
      `Wait for the story to finish first.`,
      true
    ));
  }

  const options = req.body.data.options || [];
  const typeOption = options.find(opt => opt.name === 'type');
  const contentOption = options.find(opt => opt.name === 'content');
  
  if (!typeOption || !contentOption) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Please provide both type and content for your epilogue!`, true));
  }
  
  const type = typeOption.value;
  const content = contentOption.value.trim();
  
  if (content.length < 10) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Please provide a more detailed epilogue response (at least 10 characters).`, true));
  }
  
  // Add the epilogue response
  const result = adventure.addEpilogueResponse(userId, type, content);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }
  
  // Format response type display
  let typeDisplay;
  switch (type) {
    case 'character_growth':
      typeDisplay = '📖 Character Growth';
      break;
    case 'unresolved_thread':
      typeDisplay = '🧵 Unresolved Thread';
      break;
    case 'future_hook':
      typeDisplay = '🔮 Future Hook';
      break;
    default:
      typeDisplay = 'Epilogue';
  }
  
  // Don't post individual epilogues - will post all together when complete
  
  // Build response message for thread
  let responseMessage = `✅ **Epilogue Posted to Community!**\n\n`;
  
  // Check if all players have responded
  if (result.allComplete) {
    // Post complete story chronicle to general chat
    try {
      const parentChannelId = await getThreadParentChannel(channelId);
      
      let chronicleContent = `📚 **STORY CHRONICLE COMPLETE** 📚\n\n`;
      
      // Add finale
      if (adventure.finaleContent) {
        // Get finale author's character name
        const finalePlayer = gameStorage.getPlayer(adventure.finaleContent.author);
        const finaleCharacterName = finalePlayer ? finalePlayer.getCharacterName() : 'Unknown Character';
        
        chronicleContent += `🎭 **FINALE** - *The Story Concludes*\n`;
        chronicleContent += `**Host:** <@${adventure.finaleContent.author}> (${finaleCharacterName})\n\n`;
        chronicleContent += `**"${adventure.finaleContent.content}"**\n\n`;
        chronicleContent += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      }
      
      // Add all epilogues
      chronicleContent += `✨ **EPILOGUE CONTRIBUTIONS** ✨\n\n`;
      
      for (const participantId of adventure.participants) {
        const epilogue = adventure.epilogueResponses[participantId];
        if (epilogue) {
          let typeDisplay;
          switch (epilogue.type) {
            case 'character_growth':
              typeDisplay = '📖 Character Growth';
              break;
            case 'unresolved_thread':
              typeDisplay = '🧵 Unresolved Thread';
              break;
            case 'future_hook':
              typeDisplay = '🔮 Future Hook';
              break;
            default:
              typeDisplay = 'Epilogue';
          }
          
          // Get character name
          const player = gameStorage.getPlayer(participantId);
          const characterName = player ? player.getCharacterName() : 'Unknown Character';
          
          chronicleContent += `**${typeDisplay}** by <@${participantId}> (${characterName})\n`;
          chronicleContent += `**"${epilogue.content}"**\n\n`;
        }
      }
      
      chronicleContent += `🌟 **Thank you to all participants!**`;
      
      await postToChannel(parentChannelId, chronicleContent);
    } catch (error) {
      console.error('Failed to post story chronicle to general chat:', error);
    }
    
    responseMessage += `🎊 **All Epilogue Contributions Complete!** \n\n`;
    responseMessage += `This story and its community contributions have been recorded. `;
    responseMessage += `Thank you for expanding our shared world! 🌟\n\n`;
    responseMessage += `*These epilogue contributions can inspire future stories and enrich the ongoing narrative.*`;
  } else {
    responseMessage += `📝 **Awaiting epilogue from ${result.remainingCount} more player(s)**`;
  }

  return res.send(createSuccessResponse(responseMessage));
}

/**
 * Handle /leave command - Leave current job or adventure
 */
export async function handleLeaveCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);

  // Check if user is in any active job
  const activeJob = gameStorage.getUserActiveJob(userId);
  if (!activeJob) {
    return res.send(createErrorResponse(
      `${EMOJIS.ERROR} **Not in Any Adventure**\n\n` +
      `You're not currently participating in any jobs or adventures.`,
      true
    ));
  }

  // Check if adventure has already started
  const adventure = gameStorage.findAdventureByJobId(activeJob.id);
  if (adventure && adventure.phase === ADVENTURE_PHASES.PLAYING) {
    // Allow leaving active adventures, but warn about consequences
    let confirmMessage = `⚠️ **Leave Active Adventure?**\n\n`;
    confirmMessage += `This will remove you from: "${activeJob.description}"\n\n`;
    confirmMessage += `**⚠️ Warning:** Leaving mid-adventure may disrupt the story for other players. `;
    confirmMessage += `Consider discussing with your group first.\n\n`;
    
    // Show last activity if available
    if (adventure.lastActivityAt) {
      const timeSinceActivity = Date.now() - adventure.lastActivityAt;
      const hoursAgo = Math.floor(timeSinceActivity / (1000 * 60 * 60));
      if (hoursAgo > 0) {
        confirmMessage += `📅 *Last activity: ${hoursAgo} hour(s) ago*\n\n`;
      }
    }
    
    confirmMessage += `Run this command again to confirm leaving the active adventure.`;
    
    // Check if this is a confirmation (second time running the command)
    const confirmOption = req.body.data.options?.find(opt => opt.name === 'confirm');
    const isConfirmation = confirmOption?.value === true;
    
    if (!isConfirmation) {
      confirmMessage += `\n💡 **To confirm leaving:** \`/leave confirm:true\``;
      return res.send(createErrorResponse(confirmMessage, true));
    }
  }

  // Remove user from job
  const result = activeJob.removeParticipant(userId);
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }

  // If adventure exists, also remove from adventure and check if it can continue
  if (adventure) {
    // Remove from adventure participants
    const participantIndex = adventure.participants.indexOf(userId);
    if (participantIndex !== -1) {
      adventure.participants.splice(participantIndex, 1);
      
      // Check if adventure can still continue
      const remainingParticipants = adventure.participants.length;
      
      if (remainingParticipants < GAME_CONSTANTS.MIN_PLAYERS) {
        // Not enough players - end the adventure
        gameStorage.removeAdventure(adventure.id);
        
        // Remove the associated thread if it exists
        const activeThreads = gameStorage.getActiveThreads();
        const threadInfo = Object.values(activeThreads).find(t => t.jobId === activeJob.id);
        if (threadInfo) {
          gameStorage.removeThread(activeJob.id);
        }
        
        // Notify remaining players that adventure ended
        try {
          const endMessage = `🚫 **Adventure Ended - Insufficient Players**\n\n` +
            `A participant has left, bringing the group below the minimum ${GAME_CONSTANTS.MIN_PLAYERS} players required.\n\n` +
            `*The adventure has been automatically concluded. You're free to join new adventures!*`;
          await postToChannel(adventure.threadId, endMessage);
        } catch (error) {
          console.error('Failed to notify players of adventure end:', error);
        }
      } else {
        // Adventure continues with remaining players - no additional storage update needed
        // (adventure object is modified in-place)
      }
    }
  }

  // Update job in storage (or remove if adventure ended)
  if (adventure && adventure.participants.length < GAME_CONSTANTS.MIN_PLAYERS) {
    // Job and adventure both ended - remove job entirely
    gameStorage.removeJob(activeJob.id);
  } else {
    gameStorage.updateJob(activeJob);
  }

  let responseMessage = `✅ **Left Adventure**\n\n`;
  responseMessage += `You've left: "${activeJob.description}"\n\n`;
  
  // Different messaging based on whether adventure was active
  if (adventure && adventure.phase === ADVENTURE_PHASES.PLAYING) {
    const remainingInAdventure = adventure.participants?.length || 0;
    
    if (remainingInAdventure < GAME_CONSTANTS.MIN_PLAYERS) {
      responseMessage += `🚫 **Adventure Ended** - Insufficient players remaining\n\n`;
      responseMessage += `*The adventure has been automatically concluded since fewer than ${GAME_CONSTANTS.MIN_PLAYERS} players remain.*\n\n`;
    } else {
      responseMessage += `⚠️ **Active Adventure** - ${remainingInAdventure} player(s) continue the story\n\n`;
      responseMessage += `*The remaining players can continue their adventure.*\n\n`;
    }
  } else {
    // Check if job now has too few participants (pre-game)
    const remaining = result.totalParticipants;
    if (remaining < GAME_CONSTANTS.MIN_PLAYERS) {
      responseMessage += `⚠️ *Job now has ${remaining}/${GAME_CONSTANTS.MIN_PLAYERS} players minimum - needs more participants to start.*\n\n`;
    } else {
      responseMessage += `📊 *Job now has ${remaining} participant(s).*\n\n`;
    }
  }
  
  responseMessage += `You can now join other adventures using \`/jobs\`!`;

  return res.send(createSuccessResponse(responseMessage, true));
}