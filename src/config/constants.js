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
  MIN_PLAYERS: 3,
  MAX_SCENES: 4,
  TRAITS_PER_PLAYER: 3,
  SUCCESS_THRESHOLD: 9,
  FAILURE_THRESHOLD: 5
};

// Adventure Phases
export const ADVENTURE_PHASES = {
  WAITING: 'waiting',
  SETUP: 'setup',
  PLAYING: 'playing',
  COMPLETED: 'completed'
};

// Setup Phases
export const SETUP_PHASES = {
  CHARACTER_CREATION: 'character_creation',
  COMPLETE: 'complete'
};

// Character Traits
export const CHARACTER_TRAITS = {
  CONVICTION: 'conviction',
  TALENT: 'talent',
  QUIRK: 'quirk'
};

// Scene States
export const SCENE_STATES = {
  SETUP: 'setup',
  ACTIVE: 'active',
  TRANSITION: 'transition',
  COMPLETE: 'complete'
};

// Message Templates
export const MESSAGES = {
  ERRORS: {
    NO_ADVENTURE: '❌ No active adventure found in this thread.',
    NOT_PARTICIPANT: '❌ You are not a participant in this adventure!',
    ALREADY_STARTED: '❌ Adventure has already begun or completed setup!',
    CHARACTER_CREATION_NOT_ACTIVE: '❌ Character creation is not active. Use `/begin` first!',
    CHARACTER_CREATION_NOT_STARTED: "❌ Character creation hasn't started yet. Use `/begin` first!",
    WRONG_PHASE: "❌ It's not time for {phase}! Current phase: {currentPhase}",
    NOT_YOUR_TURN: "❌ It's <@{currentPlayer}>'s turn to {action}!",
    JOB_NOT_AVAILABLE: 'This job is no longer available.',
    ALREADY_JOINED: 'You have already joined this adventure!',
    THREAD_CREATE_ERROR: '❌ Error creating adventure thread. Please try again.',
    INSUFFICIENT_PLAYERS: '❌ Need at least {minPlayers} players to start an adventure. Current: {currentPlayers}',
    INCOMPLETE_CHARACTER: '❌ You must complete your character first! Use /conviction, /talent, and /quirk commands.',
    TRAIT_ALREADY_USED: '❌ You have already used your {trait} trait this adventure!',
    TRAIT_NOT_DEFINED: '❌ You don\'t have a {trait} defined! Use /{trait} to set it first.'
  },
  
  SUCCESS: {
    ADVENTURE_INITIALIZED: '🎲 **Adventure Initialized!**\n\n**Quest:** "{description}"\n**Party:** <@{participants}>\n\n⚔️ **Ready to Begin**\n\nUse `/begin` to lock this quest and start character creation!\n\n*Note: Once you begin, no one else can join this adventure.*',
    
    QUEST_LOCKED: '🔒 **Quest Locked!** No more players can join.\n\n🎭 **Character Creation Begins!**\n\n✨ *Define your character through three core traits.*\n\n**Create your character using these commands:**\n\n📿 `/conviction "What you fight for"` - Your driving motivation\n⚔️ `/talent "What you excel at"` - Your signature ability  \n🎭 `/quirk "Your unique trait"` - Your personality quirk\n\n*Once everyone has defined all three traits, the adventure begins!*',
    
    GIFT_GIVEN: '🎁 **Gift Received!**\n\n**From:** <@{from}>\n**To:** <@{to}>\n**Type:** {type}\n**Gift:** "{description}"\n\n✨ *A bond is formed through this shared memory.*{nextTurn}',
    
    HEROIC_GIVEN: '⚔️ **Heroic Quality Recognized!**\n\n**From:** <@{from}>\n**To:** <@{to}>\n**Quality:** "I see {quality} in you"\n\n🌟 *This recognition will guide you in the trials ahead.*{nextTurn}',
    
    CHARACTER_CREATION_COMPLETE: '\n\n🎉 **Character Creation Complete!** Your adventure begins now!\n\n*Use adventure commands to play...*',
    
    TRAIT_SET: '✨ **Trait Defined!**\n\n**{traitType}:** "{description}"\n\n{nextAction}',

    CHARACTER_COMPLETE: '🎭 **Character Complete!**\n\n📿 **Conviction:** "{conviction}"\n⚔️ **Talent:** "{talent}"\n🎭 **Quirk:** "{quirk}"\n\n*Your character is ready for adventure!*',

    ALL_CHARACTERS_READY: '🎉 **All Characters Created!** Your adventure begins now!\n\n*The first scene awaits...*',

    JOINED_ADVENTURE: '✅ **Joined "{description}"!**\n\n📋 **Participants ({count}):** <@{participants}>\n\n🧵 **Thread:** <#{threadId}>\n\n{status}'
  },
  
  INFO: {
    ADVENTURE_READY: '⏳ **Adventure Ready** - Use `/begin` to lock the quest and start character creation!',
    
    ADVENTURE_STATUS: '🎲 **Adventure Status**\n\n**Phase:** {phase}\n**Scene:** {scene}/{maxScenes}\n**Dice Pool:** {dicePool}d6\n\n*Use adventure commands to continue your quest.*',
    
    CHARACTER_SHEET: '📜 **Your Character Sheet**\n\n📿 **Conviction:** "{conviction}" {convictionStatus}\n⚔️ **Talent:** "{talent}" {talentStatus}\n🎭 **Quirk:** "{quirk}" {quirkStatus}\n\n📊 **Usage:** {traitsUsed}/3 traits used'
  },
  
  PROMPTS: {
    TRAIT_PROMPTS: {
      CONVICTION: 'What drives your character? What do they fight for?',
      TALENT: 'What is your character naturally gifted at? Their signature ability?',
      QUIRK: 'What unique personality trait defines your character?'
    },
    
    TRAIT_EXAMPLES: {
      CONVICTION: 'Example: "Protect the innocent" or "Find my lost sister"',
      TALENT: 'Example: "Master swordsman" or "Ancient language scholar"',
      QUIRK: 'Example: "Always optimistic" or "Talks to inanimate objects"'
    },
    
    CHARACTER_CREATION_STATUS: 'Character creation progress: {completed}/{total} players ready'
  }
};

// Emojis
export const EMOJIS = {
  ADVENTURE: '🎲',
  QUEST_LOCKED: '🔒',
  CONVICTION: '📿',
  TALENT: '⚔️',
  QUIRK: '🎭',
  CHARACTER: '📜',
  STATUS: '📊',
  SUCCESS: '✅',
  ERROR: '❌',
  WAITING: '⏳',
  THREAD: '🧵',
  READY: '⚔️',
  CELEBRATION: '🎉',
  LIGHTBULB: '💡',
  SWORD: '⚔️'
};