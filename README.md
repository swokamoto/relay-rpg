# Relay RPG

A multiplayer Discord bot where players build stories together, taking turns to move the narrative forward. Each player has a persistent character, and the story plays out across a series of scenes with dice rolls and shared decisions.

## What It Does

- Characters are created once and carry over between different stories
- Players take turns writing the story, with dice rolls determining success
- Multiple players can be in active stories at the same time
- Finished stories get collected and posted to the community as a chronicle

## How I Built It

### Keeping track of whose turn it is
Each story has a state object that tracks the current player, what's waiting to happen, and where the scene is in its lifecycle. Before any action goes through, the bot checks whether it actually makes sense right now — wrong player, wrong phase, or something already in progress all get caught and rejected with a helpful message.

### Handling two players hitting a button at the same time
Discord sends each slash command as a separate web request, so there's no guarantee they arrive in order. I added a simple lock to the story state — when someone's turn is processing, any overlapping action from another player gets blocked until the first one finishes. If something goes wrong mid-turn and the lock gets stuck, there's a cleanup check that clears it so the game doesn't freeze permanently.

### Making sure games survive restarts
The bot runs on Fly.io and can restart at any time. I didn't want active games to just disappear, so everything gets saved to a SQLite database before the bot responds. If the server restarts mid-game, all the story state is still there when it comes back up.

### Keeping the code organized
Each slash command routes to its own handler file. Every handler follows the same pattern: read the current state, check if the action is valid, make the change, save it, then respond. Keeping that flow consistent made it a lot easier to track down bugs and add new commands.

## Challenges

**Two players acting at once** — Discord doesn't queue commands for you, so I had to handle the case where two players submit actions within milliseconds of each other. The lock system was the solution, but I also had to think through what happens when a lock never gets released (timeout + cleanup).

**Games surviving server restarts** — Early on I kept everything in memory, which meant a restart wiped all active games. Switching to SQLite and writing state before every response fixed that, but it also meant being careful about when exactly writes happen so nothing gets out of sync.

**Players joining or leaving mid-game** — The participant list and each player's trait usage are tracked separately, so someone leaving or being added mid-story doesn't break the state for everyone else.

## How a Command Works

```
User (Discord)
     │
     ▼ slash command
  app.js  ──► handlers/index.js  ──► adventureCommands.js
                                  ──► characterCommands.js
                                  ──► hookCommands.js
                                  ──► components.js (button clicks)
                                        │
                                        ▼
                                  models/Adventure.js   ◄──► storage/gameState.js
                                  models/Player.js              │
                                  models/Hook.js                ▼
                                                          SQLite (better-sqlite3)
```

Discord sends the command → the right handler picks it up → checks the current game state → makes the update → saves to the database → sends the response back.

## Tech Stack

Node.js · Discord Interactions API · SQLite (`better-sqlite3`) · Fly.io · Docker

## Project Structure

```
relay-rpg/
├── src/
│   ├── config/
│   │   ├── config.js            # Environment configuration
│   │   └── constants.js         # Game constants and messages
│   ├── handlers/
│   │   ├── adventureCommands.js # Story gameplay commands
│   │   ├── characterCommands.js # Character creation commands
│   │   ├── hookCommands.js      # Job board commands
│   │   ├── components.js        # Discord button/component handlers
│   │   └── index.js             # Handler routing
│   ├── models/
│   │   ├── Adventure.js         # Story/game state management
│   │   ├── Hook.js              # Job posting model
│   │   └── Player.js            # Character data model
│   ├── storage/
│   │   └── gameState.js         # In-memory data storage
│   └── utils/
│       ├── discord.js           # Discord API utilities
│       ├── gameHelpers.js       # Game logic helpers
│       └── validation.js        # Input validation
├── app.js                       # Main Discord bot entry point
├── commands.js                  # Discord slash command definitions
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

## Setup and Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Discord Application with bot token
- Basic understanding of Discord slash commands

### Discord Application Setup

1. Create a Discord Application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a bot user and get your bot token
3. Enable the following bot permissions:
   - `applications.commands` (for slash commands)
   - `Send Messages`
   - `Create Public Threads` 
   - `Send Messages in Threads`
   - `Manage Threads`

### Restricting the Bot to One Channel

To limit bot commands to a single channel (e.g. `#the-relay`) and its threads:

1. In your Discord server, go to **Server Settings** → **Integrations**
2. Find your bot and click it
3. At the top, turn off **"Allow in all channels"**
4. Add only the channel you want (e.g. `#the-relay`) as an allowed channel

Threads created inside that channel will work automatically. Commands used anywhere else will be blocked by Discord before they reach the bot.

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd relay-rpg
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   Create a `.env` file with:
   ```
   APP_ID=your_discord_app_id
   DISCORD_TOKEN=your_bot_token
   PUBLIC_KEY=your_app_public_key
   ```

4. **Register slash commands:**
   ```bash
   npm run register
   ```

5. **Set up ngrok for local testing:**
   ```bash
   # Install ngrok if you haven't
   npm install -g ngrok
   
   # Start the bot
   npm start
   
   # In another terminal, start ngrok
   ngrok http 8080
   ```

6. **Configure Discord interactions endpoint:**
   - Copy your ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - In your Discord Application settings, set:
     - **Interactions Endpoint URL**: `https://abc123.ngrok.io/interactions`

## Game Commands

### Character Creation (Required Before Playing)
```
/name "Character Name"        # Set your character's name
/conviction "description"     # What drives your character
/talent "description"         # What they excel at
/quirk "description"          # Their unique trait
```

### Story Board
```
/post "story description"     # Create a new story for others to join
/jobs                         # View available stories
/leave                        # Leave your current job or adventure
```

### Story Gameplay  
```
/begin "scene description"    # (Host) Start the story with opening scene
/turn "narrative"             # Take a turn in the story
/truth "scene fact"           # Declare a truth about the current scene
/transition "statement"       # Bridge scenes (Acts I-III only)
/status                       # Check story progress
```

### Story Completion
```
/finale "outcome"             # (Host) Describe the final outcome
/epilogue                     # Share character growth, threads, or hooks
```

## How to Play

1. **Create Your Character** - Use `/name`, `/conviction`, `/talent`, and `/quirk`
2. **Find a Story** - Use `/hooks` or create one with `/post`  
3. **Join the Story** - Click the join button on story posts
4. **Play Through Acts** - Take turns with `/turn`, declare truths with `/truth`
5. **Leave if Needed** - Use `/leave` (before start) or `/leave confirm:true` (during story)
6. **Complete the Story** - Host posts finale, everyone shares epilogues

See `RULES_ENHANCED.md` for detailed gameplay rules and examples.

## Quick Start Guide

### For Players

1. **Create Your Character** (one-time setup):
   ```
   /name "Zara Nightwhisper"
   /conviction "Protect those who cannot protect themselves"
   /talent "Master of stealth and infiltration"
   /quirk "Always leaves a calling card"
   ```

2. **Join a Story**:
   - Use `/hooks` to see available stories
   - Click the "Join Adventure" button on any story that interests you
   - Wait for the Host to start with `/begin`
   - Use `/leave` to exit before the story starts if needed

3. **Play Through the Story**:
   - Use `/truth "The guards look tired and distracted"` to add details to scenes
   - Use `/turn "I slip past the distracted guards using my stealth training"` to take actions
   - Use traits when needed for +2 bonus: `/turn "Drawing on my Conviction..."` 
   - Use `/leave confirm:true` if you must exit during an active story

4. **Complete the Story**:
   - Host describes the finale
   - Everyone shares epilogue responses
   - Story Chronicle gets posted to the community

### For Hosts

1. **Create a Story**: `/post "A mysterious artifact has been stolen from the royal vault"`
2. **Wait for Players** to join (minimum 2, maximum 6)
3. **Start the Story**: `/begin "Guards discover the theft at dawn..."`
4. **Guide When Needed**: Use `/status` to track progress
5. **Conclude**: Use `/finale "The artifact's true power is revealed..."` when the story completes

## Deploying with Fly.io

The bot is configured to run on [Fly.io](https://fly.io) with a persistent volume for the SQLite database.

### First-time setup

1. **Install the Fly CLI** and log in:
   ```bash
   fly auth login
   ```

2. **Create the app** (skip if already exists):
   ```bash
   fly launch --no-deploy
   ```

3. **Create the persistent volume** for the database:
   ```bash
   fly volumes create data --size 1 --region iad
   ```

4. **Set your secrets:**
   ```bash
   fly secrets set APP_ID=your_app_id
   fly secrets set DISCORD_TOKEN=your_bot_token
   fly secrets set PUBLIC_KEY=your_public_key
   ```

5. **Deploy:**
   ```bash
   fly deploy --ha=false
   ```
   > `--ha=false` keeps it on a single machine, which is required when using a volume.

6. **Set your Discord interactions endpoint:**
   - Run `fly info` to get your app URL (e.g. `https://relay-rpg.fly.dev`)
   - In the Discord Developer Portal, set **Interactions Endpoint URL** to `https://relay-rpg.fly.dev/interactions`

### Subsequent deploys

```bash
fly deploy --ha=false
```

### Useful commands

```bash
fly logs          # Stream live logs
fly ssh console   # SSH into the machine
fly secrets list  # View configured secrets (values hidden)
```

---

## Contributing

This is an open-source Discord bot for collaborative storytelling. Contributions welcome!

- **Bug Reports**: Please file issues with detailed steps to reproduce
- **Feature Requests**: Describe the storytelling need your feature would address  
- **Code Contributions**: Follow existing patterns and include tests for new features
