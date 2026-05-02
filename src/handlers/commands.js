import { handlePostCommand, handleJobsCommand } from './jobCommands.js';
import { 
  handleBeginCommand, 
  handleStatusCommand,
  handleTurnCommand,
  handleTransitionCommand,
  handleFinaleCommand,
  handleEpilogueCommand,
  handleLeaveCommand,
  handleInviteCommand,
  handleRemoveCommand
} from './adventureCommands.js';
import { handleTruthCommand } from './truthCommand.js';
import { 
  handleNameCommand,
  handleConvictionCommand,
  handleTalentCommand,
  handleQuirkCommand,
  handleCharacterCommand,
  handleUseTraitCommand
} from './characterCommands.js';
import { createErrorResponse } from '../utils/discord.js';

/**
 * Main command handler - Routes commands to appropriate handlers
 */
export async function handleCommands(req, res, gameState) {
  const { data } = req.body;
  const { name } = data;

  try {
    switch (name) {
      case 'post':
        return await handlePostCommand(req, res, gameState);
      
      case 'jobs':
        return await handleJobsCommand(req, res, gameState);
      
      case 'begin':
        return await handleBeginCommand(req, res, gameState);
      
      case 'name':
        return await handleNameCommand(req, res, gameState);
      
      case 'conviction':
        return await handleConvictionCommand(req, res, gameState);
      
      case 'talent':
        return await handleTalentCommand(req, res, gameState);
      
      case 'quirk':
        return await handleQuirkCommand(req, res, gameState);
      
      case 'use':
        return await handleUseTraitCommand(req, res, gameState);
      
      case 'turn':
        return await handleTurnCommand(req, res, gameState);
      
      case 'truth':
        return await handleTruthCommand(req, res, gameState);
      
      case 'transition':
        return await handleTransitionCommand(req, res, gameState);
      
      case 'finale':
        return await handleFinaleCommand(req, res, gameState);
      
      case 'epilogue':
        return await handleEpilogueCommand(req, res, gameState);
      
      case 'status':
        return await handleStatusCommand(req, res, gameState);
      
      case 'character':
        return await handleCharacterCommand(req, res, gameState);
      
      case 'leave':
        return await handleLeaveCommand(req, res, gameState);
      
      case 'invite':
        return await handleInviteCommand(req, res, gameState);
      
      case 'remove':
        return await handleRemoveCommand(req, res, gameState);
      
      default:
        console.error(`Unknown command: ${name}`);
        return res.status(400).json({ error: 'unknown command' });
    }
  } catch (error) {
    console.error('Error handling command:', error);
    return res.send(createErrorResponse(
      '❌ An error occurred while processing your command. Please try again.',
      true
    ));
  }
}