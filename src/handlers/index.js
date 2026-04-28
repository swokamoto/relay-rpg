import { InteractionType } from 'discord-interactions';
import { handleCommands } from './commands.js';
import { handleComponents } from './components.js';
import { createErrorResponse } from '../utils/discord.js';

/**
 * Main interaction handler - Routes Discord interactions to appropriate handlers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Object} gameState - Game state object containing all game data
 * @returns {Promise<void>}
 */
export async function handleInteractions(req, res, gameState) {
  const { type } = req.body;

  try {
    switch (type) {
      case InteractionType.PING:
        return res.send({ type: 1 }); // Pong response for Discord verification
      
      case InteractionType.APPLICATION_COMMAND:
        return await handleCommands(req, res, gameState);
      
      case InteractionType.MESSAGE_COMPONENT:
        return await handleComponents(req, res, gameState);
      
      default:
        console.error('Unknown interaction type:', type);
        return res.status(400).json({ error: 'unknown interaction type' });
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    return res.send(createErrorResponse(
      '❌ An unexpected error occurred. Please try again later.',
      true
    ));
  }
}