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
  COMPLETE: 'complete',
  EPILOGUE: 'epilogue'
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
    ALREADY_STARTED: '❌ Adventure has already begun or completed setup!',
    CHARACTER_CREATION_NOT_ACTIVE: '❌ Character creation is not active. Use `/begin` first!',
    CHARACTER_CREATION_NOT_STARTED: "❌ Character creation hasn't started yet. Use `/begin` first!",
    WRONG_PHASE: "❌ It's not time for {phase}! Current phase: {currentPhase}",
    NOT_YOUR_TURN: "❌ It's <@{currentPlayer}>'s turn to {action}!",
    HOOK_NOT_AVAILABLE: 'This story hook is no longer available.',
    ALREADY_JOINED: 'You have already joined this adventure!',
    THREAD_CREATE_ERROR: '❌ Error creating adventure thread. Please try again.',
    INSUFFICIENT_PLAYERS: '❌ Need at least {minPlayers} players to start an adventure. Current: {currentPlayers}',
    INCOMPLETE_CHARACTER: '❌ You must complete your character first! Use /conviction, /talent, and /quirk commands.',
    TRAIT_ALREADY_USED: '❌ You have already used your {trait} trait this adventure!',
    TRAIT_NOT_DEFINED: '❌ You don\'t have a {trait} defined! Use /{trait} to set it first.'
  },
  
  SUCCESS: {
    ADVENTURE_INITIALIZED: '🎲 **Story Initialized!**\n\n**Scenario:** "{description}"\n**Participants:** <@{participants}>\n\n⚔️ **Ready to Begin**\n\nUse `/begin` to lock this story and start character creation!\n\n*Note: Once you begin, no one else can join this story.*',
    
    QUEST_LOCKED: '🔒 **Story Locked!** No more players can join.\n\n🎭 **Character Creation Begins!**\n\n✨ *Define your character through three core traits.*\n\n**Create your character using these commands:**\n\n📿 `/conviction "What you fight for"` - Your driving motivation\n⚔️ `/talent "What you excel at"` - Your signature ability  \n🎭 `/quirk "Your unique trait"` - Your personality quirk\n\n*Once everyone has defined all three traits, the story begins!*',
    
    GIFT_GIVEN: '🎁 **Gift Received!**\n\n**From:** <@{from}>\n**To:** <@{to}>\n**Type:** {type}\n**Gift:** "{description}"\n\n✨ *A bond is formed through this shared memory.*{nextTurn}',
    
    HEROIC_GIVEN: '⚔️ **Heroic Quality Recognized!**\n\n**From:** <@{from}>\n**To:** <@{to}>\n**Quality:** "I see {quality} in you"\n\n🌟 *This recognition will guide you in the trials ahead.*{nextTurn}',
    
    CHARACTER_CREATION_COMPLETE: '\n\n🎉 **Character Creation Complete!** Your story begins now!\n\n*Use story commands to play...*',
    
    TRAIT_SET: '✨ **Trait Defined!**\n\n**{traitType}:** "{description}"\n\n{nextAction}',

    CHARACTER_COMPLETE: '🎭 **Character Complete!**\n\n📿 **Conviction:** "{conviction}"\n⚔️ **Talent:** "{talent}"\n🎭 **Quirk:** "{quirk}"\n\n*Your character is ready for adventure!*',

    ALL_CHARACTERS_READY: '🎉 **All Characters Created!** Your adventure begins now!\n\n*The first scene awaits...*',

    JOINED_ADVENTURE: '✅ **Joined "{description}"!**\n\n📋 **Participants ({count}):** <@{participants}>\n\n🧵 **Thread:** <#{threadId}>\n\n{status}'
  },
  
  INFO: {
    ADVENTURE_READY: '⏳ **Story Ready** - Use `/begin` to lock the story and start character creation!'
  },
  
  PROMPTS: {
    ACT_TRANSITIONS: {
      ACT_1_TO_2: 'The initial challenge leads to greater complications...',
      ACT_2_TO_3: 'The situation escalates as the true scope of the story becomes clear...',
      ACT_3_TO_4: 'The climax approaches! Everything leads to this final confrontation...'
    },
    
    ADVENTURE_ENDING: {
      QUEST_HOST_PROMPT: '🎭 **Story Complete!** <@{questHost}>, as the Host, describe the final outcome and resolution of this story.',
      EPILOGUE_PROMPT: '📖 **Epilogue Phase** \n\nEach player must now share one final post using `/epilogue`: \n\n📿 **Character Growth** - How did your character change or what did they learn?\n🧵 **Unresolved Thread** - What question or mystery remains from this story?\n🔮 **Future Hook** - What new story idea does this inspire?\n\n*These will be shared with the community to expand the world!*',
      EPILOGUE_COMPLETE: '✨ **Story Chronicle Complete!** \n\nThis tale and its epilogue contributions have been recorded for the community. Well played, everyone!'
    }
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