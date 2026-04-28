import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId 
} from '../utils/discord.js';
import { 
  validateTraitDescription, 
  validateCharacterCompletion 
} from '../utils/validation.js';
import { formatMessage } from '../utils/gameHelpers.js';
import { MESSAGES, EMOJIS, ADVENTURE_PHASES, SETUP_PHASES, CHARACTER_TRAITS } from '../config/constants.js';

/**
 * Handle /conviction command - Set character's conviction trait
 */
export async function handleConvictionCommand(req, res, gameStorage) {
  return handleTraitCommand(req, res, gameStorage, CHARACTER_TRAITS.CONVICTION);
}

/**
 * Handle /talent command - Set character's talent trait
 */
export async function handleTalentCommand(req, res, gameStorage) {
  return handleTraitCommand(req, res, gameStorage, CHARACTER_TRAITS.TALENT);
}

/**
 * Handle /quirk command - Set character's quirk trait
 */
export async function handleQuirkCommand(req, res, gameStorage) {
  return handleTraitCommand(req, res, gameStorage, CHARACTER_TRAITS.QUIRK);
}

/**
 * Generic trait handler - works globally, not tied to adventures
 */
async function handleTraitCommand(req, res, gameStorage, traitType) {
  const userId = getUserId(req);
  const description = req.body.data.options[0].value;
  
  // Validate trait description
  const validation = validateTraitDescription(description, traitType);
  if (!validation.valid) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${validation.error}`, true));
  }
  
  // Get or create global player character
  const player = gameStorage.getOrCreatePlayer(userId);
  
  try {
    // Check if trait already exists
    const sheet = player.getCharacterSheet();
    const existingTrait = sheet.traits[traitType]?.description;
    const isUpdate = !!existingTrait;
    
    // Set the trait
    player.setTrait(traitType, validation.description);
    
    // Get trait icon and name for response
    const traitIcon = EMOJIS[traitType.toUpperCase()];
    const traitName = traitType.charAt(0).toUpperCase() + traitType.slice(1);
    
    // Build response based on whether this is new or updated
    let content = `${traitIcon} **${traitName} ${isUpdate ? 'Updated' : 'Set'}!**\n\n`;
    
    if (isUpdate) {
      content += `**Previous:** "${existingTrait}"\n**New:** "${validation.description}"\n\n`;
    } else {
      content += `**Description:** "${validation.description}"\n\n`;
    }
    
    // Check if character is now complete
    const updatedSheet = player.getCharacterSheet();
    if (player.isCharacterComplete()) {
      content += `🎉 **Character Complete!**\n\n📿 **Conviction:** "${updatedSheet.conviction}"\n⚔️ **Talent:** "${updatedSheet.talent}"\n🎭 **Quirk:** "${updatedSheet.quirk}"\n\n✨ *Your character is ready for adventure! You can now join any quest.*`;
    } else {
      // Show what still needs to be set
      const missing = [];
      if (!updatedSheet.conviction) missing.push('📿 `/conviction`');
      if (!updatedSheet.talent) missing.push('⚔️ `/talent`');
      if (!updatedSheet.quirk) missing.push('🎭 `/quirk`');
      
      content += `📋 **Still Need:** ${missing.join(', ')}\n\n*Complete all traits to join adventures!*`;
    }
      
    return res.send(createSuccessResponse(content, true)); // Make ephemeral
  } catch (error) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${error.message}`, true));
  }
}

/**
 * Handle /character command - Show player's global character sheet
 */
export async function handleCharacterCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  
  // Get global player character
  const player = gameStorage.getPlayer(userId);
  
  if (!player) {
    return res.send(createSuccessResponse(
      `${EMOJIS.CHARACTER} **No Character Yet!**\n\n` +
      `Create your character using:\n` +
      `📿 \`/conviction "What you fight for"\`\n` +
      `⚔️ \`/talent "What you excel at"\`\n` +
      `🎭 \`/quirk "Your unique trait"\`\n\n` +
      `*These work in any channel and persist across all adventures!*`,
      true // Make ephemeral
    ));
  }
  
  const characterSheet = player.getCharacterSheet();
  const isComplete = player.isCharacterComplete();
  
  let content = `${EMOJIS.CHARACTER} **Your Character**\n\n`;
  
  // Show traits with their usage status
  Object.entries(characterSheet.traits).forEach(([traitType, traitData]) => {
    const traitIcon = EMOJIS[traitType.toUpperCase()];
    const traitName = traitType.charAt(0).toUpperCase() + traitType.slice(1);
    const usageStatus = traitData.used ? ' ✅ *Used*' : '';
    
    if (traitData.description) {
      content += `${traitIcon} **${traitName}:** "${traitData.description}"${usageStatus}\n`;
    } else {
      content += `${traitIcon} **${traitName}:** *Not set* - use \`/${traitType}\`\n`;
    }
  });
  
  if (isComplete) {
    content += `\n✅ **Character Complete!** Ready for adventures.\n`;
    content += `\n💡 **Usage:** In adventures, use \`/roll trait:conviction\` etc. for +2 bonus (once per adventure)`;
  } else {
    const missing = [];
    if (!characterSheet.conviction) missing.push('📿 `/conviction`');
    if (!characterSheet.talent) missing.push('⚔️ `/talent`');
    if (!characterSheet.quirk) missing.push('🎭 `/quirk`');
    
    content += `\n📋 **Still Need:** ${missing.join(', ')}\n`;
    content += `\n*Complete all traits to join adventures!*`;
  }
  
  return res.send(createSuccessResponse(content, true)); // Make ephemeral
}

/**
 * Handle /use command - Use a character trait for bonus
 */
export async function handleUseTraitCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  const traitType = req.body.data.options[0].value.toLowerCase();
  
  // Find active adventure for this thread
  const activeGames = gameStorage.getActiveAdventures();
  const adventure = Object.values(activeGames).find(game => game.threadId === channelId);
  
  if (!adventure) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.NO_ADVENTURE, true));
  }
  
  if (adventure.phase !== ADVENTURE_PHASES.PLAYING) {
    return res.send(createErrorResponse('❌ Adventure must be in progress to use traits!', true));
  }
  
  if (!adventure.isParticipant(userId)) {
    return res.send(createErrorResponse(MESSAGES.ERRORS.NOT_PARTICIPANT, true));
  }

  const player = adventure.getPlayer(userId);
  const result = player.useTrait(traitType);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }
  
  const traitIcon = EMOJIS[traitType.toUpperCase()];
  const traitName = traitType.charAt(0).toUpperCase() + traitType.slice(1);
  
  const content = `${traitIcon} **${traitName} Used!**\n\n**Description:** "${result.trait.description}"\n\n🎲 **+2 bonus applied to your next roll!**`;
  
  return res.send(createSuccessResponse(content));
}