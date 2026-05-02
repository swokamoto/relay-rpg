import 'dotenv/config';
import { capitalize, InstallGlobalCommands } from './utils.js';
const POST_COMMAND = {
  name: 'post',
  description: 'Post a job to the tavern board',
  options: [
    {
      type: 3,
      name: 'description',
      description: 'Describe the job or scenario',
      required: true,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const JOBS_COMMAND = {
  name: 'jobs',
  description: 'View available jobs on the tavern board',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

// Character Creation Commands
const NAME_COMMAND = {
  name: 'name',
  description: 'Give your character a name',
  options: [
    {
      type: 3,
      name: 'character_name',
      description: 'What is your character\'s name?',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const CONVICTION_COMMAND = {
  name: 'conviction',
  description: 'Define what your character fights for (their driving motivation)',
  options: [
    {
      type: 3,
      name: 'description',
      description: 'What drives your character? What do they fight for?',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const TALENT_COMMAND = {
  name: 'talent',
  description: 'Define what your character excels at (their signature ability)',
  options: [
    {
      type: 3,
      name: 'description',
      description: 'What is your character naturally gifted at?',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const QUIRK_COMMAND = {
  name: 'quirk',
  description: 'Define your character\'s unique personality trait',
  options: [
    {
      type: 3,
      name: 'description',
      description: 'What unique personality trait defines your character?',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const USE_COMMAND = {
  name: 'use',
  description: 'Use one of your traits for a +2 bonus on a dice roll',
  options: [
    {
      type: 3,
      name: 'trait',
      description: 'Which trait to use (conviction, talent, or quirk)',
      required: true,
      choices: [
        {
          name: 'Conviction - What you fight for',
          value: 'conviction'
        },
        {
          name: 'Talent - What you excel at',
          value: 'talent'
        },
        {
          name: 'Quirk - Your personality trait',
          value: 'quirk'
        }
      ]
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const STATUS_COMMAND = {
  name: 'status',
  description: 'Check story setup and character creation progress',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const BEGIN_COMMAND = {
  name: 'begin',
  description: 'Lock the story and begin with opening scene description',
  options: [
    {
      type: 3,
      name: 'scene',
      description: 'Describe the opening scene of this story',
      required: true
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const CHARACTER_COMMAND = {
  name: 'character',
  description: 'View your character sheet with traits',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const TURN_COMMAND = {
  name: 'turn',
  description: 'Take a narrative turn: resolve previous result and describe your action',
  options: [
    {
      type: 3,
      name: 'narrative',
      description: 'Your turn: "Resolution of last result + your action"',
      required: true
    },
    {
      type: 3,
      name: 'trait',
      description: 'Optional: use a trait for +2 bonus on your action',
      required: false,
      choices: [
        {
          name: 'Conviction - What you fight for',
          value: 'conviction'
        },
        {
          name: 'Talent - What you excel at',
          value: 'talent'
        },
        {
          name: 'Quirk - Your personality trait',
          value: 'quirk'
        }
      ]
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const TRUTH_COMMAND = {
  name: 'truth',
  description: 'Declare a truth about the current scene (1 per scene per player)',
  options: [
    {
      type: 3,
      name: 'description',
      description: 'A detail about the environment, situation, or scene',
      required: true
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const TRANSITION_COMMAND = {
  name: 'transition',
  description: 'Provide scene transition with "but" and "therefore" elements',
  options: [
    {
      type: 3,
      name: 'statement',
      description: '"[How outcome plays out], but [complication], therefore [next scene setup]"',
      required: true
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const EPILOGUE_COMMAND = {
  name: 'epilogue',
  description: 'Share your character\'s final reflection after the story',
  options: [
    {
      type: 3,
      name: 'type',
      description: 'What type of epilogue are you sharing?',
      required: true,
      choices: [
        {
          name: '📖 Character Growth - How did your character change?',
          value: 'character_growth'
        },
        {
          name: '🧵 Unresolved Thread - What mystery remains?', 
          value: 'unresolved_thread'
        },
        {
          name: '🔮 Future Hook - What new story idea emerged?',
          value: 'future_hook'
        }
      ]
    },
    {
      type: 3,
      name: 'content',
      description: 'Your epilogue response (will be shared with the community)',
      required: true
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const FINALE_COMMAND = {
  name: 'finale',
  description: '(Host only) Describe the final outcome of the completed story',
  options: [
    {
      type: 3,
      name: 'outcome',
      description: 'Describe how the story concludes and what happens to the world',
      required: true
    }
  ],
  type: 1,
  integration_types: [0, 1], 
  contexts: [0, 2],
};

const LEAVE_COMMAND = {
  name: 'leave',
  description: 'Leave your current job or adventure',
  options: [
    {
      type: 5,
      name: 'confirm',
      description: 'Confirm leaving an active adventure (required for started games)',
      required: false,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const INVITE_COMMAND = {
  name: 'invite',
  description: 'Invite a player to join your active adventure mid-story',
  options: [
    {
      type: 6,
      name: 'player',
      description: 'The player to invite',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const KICK_COMMAND = {
  name: 'kick',
  description: 'Remove a player from the active adventure (host only)',
  options: [
    {
      type: 6,
      name: 'player',
      description: 'The player to remove',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const ALL_COMMANDS = [POST_COMMAND, JOBS_COMMAND, BEGIN_COMMAND, NAME_COMMAND, CONVICTION_COMMAND, TALENT_COMMAND, QUIRK_COMMAND, USE_COMMAND, STATUS_COMMAND, CHARACTER_COMMAND, TURN_COMMAND, TRUTH_COMMAND, TRANSITION_COMMAND, EPILOGUE_COMMAND, FINALE_COMMAND, LEAVE_COMMAND, INVITE_COMMAND, KICK_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
