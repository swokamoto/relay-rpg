import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} from 'discord-interactions';

// Import our modular components
import { config } from './src/config/config.js';
import { gameStorage } from './src/storage/gameState.js';
import { handleInteractions } from './src/handlers/index.js';

// Create an express app
const app = express();
// Get port from config
const PORT = config.server.port;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', verifyKeyMiddleware(config.discord.publicKey), async function (req, res) {
  const { type } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle all other interactions through our modular handler
   */
  return await handleInteractions(req, res, gameStorage);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🎲 RelayRPG Bot listening on port', PORT);
  
  // Run periodic cleanup
  setInterval(() => {
    const cleanedHooks = gameStorage.cleanupCompletedHooks();
    const cleanedThreads = gameStorage.cleanupOldThreads();
    
    if (cleanedHooks > 0 || cleanedThreads > 0) {
      console.log(`🧹 Cleanup: ${cleanedHooks} hooks, ${cleanedThreads} threads removed`);
    }
  }, 60 * 60 * 1000); // Run every hour
});
