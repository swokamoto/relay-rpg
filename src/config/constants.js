// Discord API Constants
export const DISCORD_CONSTANTS = {
  THREAD_TYPE: {
    PUBLIC_THREAD: 11
  },
  AUTO_ARCHIVE_DURATION: {
    ONE_HOUR: 60,
    ONE_DAY: 1440,
    THREE_DAYS: 4320,
    ONE_WEEK: 10080
  }
};

// Game Constants
export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 5,
  MAX_SCENES: 4,
  TRAITS_PER_PLAYER: 3,
  TRUTHS_PER_SCENE: 1,
  SUCCESS_THRESHOLD: 9,
  FAILURE_THRESHOLD: 5,
  CRITICAL_SUCCESS_THRESHOLD: 11,
  CRITICAL_FAILURE_THRESHOLD: 3
};

// Adventure Phases
export const ADVENTURE_PHASES = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed'
};

// Character Traits
export const CHARACTER_TRAITS = {
  CONVICTION: 'conviction',
  TALENT: 'talent',
  QUIRK: 'quirk'
};

// Epilogue Response Types
export const EPILOGUE_TYPES = {
  GROWTH: 'character_growth',
  THREAD: 'unresolved_thread', 
  HOOK: 'future_hook'
};

// Message Templates
export const MESSAGES = {
  ERRORS: {
    NO_ADVENTURE: '❌ No active adventure found in this thread.',
    NOT_PARTICIPANT: '❌ You are not a participant in this adventure!',
    HOOK_NOT_AVAILABLE: 'This story hook is no longer available.',
    THREAD_CREATE_ERROR: '❌ Error creating adventure thread. Please try again.'
  }
};

// Emojis
export const EMOJIS = {
  ADVENTURE: '🎲',
  CHARACTER: '📜',
  SUCCESS: '✅',
  ERROR: '❌',
  WAITING: '⏳',
  READY: '⚔️',
  LIGHTBULB: '💡',
  SWORD: '⚔️'
};