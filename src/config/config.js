import 'dotenv/config';

// Environment configuration
export const config = {
  // Discord Bot Configuration
  discord: {
    applicationId: process.env.APP_ID,
    publicKey: process.env.PUBLIC_KEY,
    botToken: process.env.DISCORD_TOKEN
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 8080,
    environment: process.env.NODE_ENV || 'development'
  },

  // Game Configuration
  game: {
    threadAutoArchiveDuration: parseInt(process.env.THREAD_AUTO_ARCHIVE) || 1440 // 24 hours
  },

  // Validation
  validate() {
    const required = [
      'discord.applicationId',
      'discord.publicKey',
      'discord.botToken'
    ];

    const missing = required.filter(key => {
      const value = key.split('.').reduce((obj, k) => obj?.[k], this);
      return !value;
    });

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return true;
  }
};

// Validate configuration on import
config.validate();