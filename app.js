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

app.post('/interactions', verifyKeyMiddleware(config.discord.publicKey), async function (req, res) {
  const { type } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  return await handleInteractions(req, res, gameStorage);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🎲 RelayRPG Bot listening on port', PORT);
  
  // Run periodic cleanup
  setInterval(() => {
    const cleanedHooks = gameStorage.cleanupCompletedHooks();
    if (cleanedHooks > 0) {
      console.log(`🧹 Cleanup: ${cleanedHooks} hooks removed`);
    }
  }, 60 * 60 * 1000); // Run every hour
});
