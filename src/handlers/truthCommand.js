import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId 
} from '../utils/discord.js';
import { MESSAGES, EMOJIS } from '../config/constants.js';

/**
 * Handle /truth command - Declare truth about current scene
 */
export async function handleTruthCommand(req, res, gameStorage) {
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

  // Get description from command options
  const options = req.body.data.options || [];
  const descOption = options.find(opt => opt.name === 'description');
  
  if (!descOption || !descOption.value.trim()) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Please provide a truth description!`, true));
  }
  
  const truthDescription = descOption.value.trim();
  
  if (truthDescription.length < 5) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} Please provide a more detailed truth (at least 5 characters).`, true));
  }
  
  // Declare the truth
  const result = adventure.declareTruth(userId, truthDescription);
  
  if (!result.success) {
    return res.send(createErrorResponse(`${EMOJIS.ERROR} ${result.error}`, true));
  }

  // Persist truth declaration
  gameStorage.updateAdventure(adventure);

  // Get the player to show character name
  const player = gameStorage.getPlayer(userId);
  const characterName = player ? player.getCharacterName() : 'Unknown Character';

  // Build response message
  let content = `**${characterName}** declares: **"${result.truth.description}"**`;

  return res.send(createSuccessResponse(content));
}