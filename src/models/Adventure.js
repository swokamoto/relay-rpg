import { 
  ADVENTURE_PHASES, 
  SETUP_PHASES, 
  CHARACTER_TRAITS, 
  GAME_CONSTANTS,
  SCENE_STATES,
  EPILOGUE_TYPES
} from '../config/constants.js';
import { 
  generateAdventureId, 
  deduplicate
} from '../utils/gameHelpers.js';
import { Player } from './Player.js';

/**
 * Adventure class to manage game state
 */
export class Adventure {
  constructor(jobId, threadId, participants) {
    this.id = generateAdventureId(jobId);
    this.threadId = threadId;
    this.jobId = jobId;
    this.participants = deduplicate(participants);
    this.phase = ADVENTURE_PHASES.WAITING;
    this.currentPhase = SETUP_PHASES.COMPLETE; // Skip character creation - it's global now
    this.scene = 1;
    this.sceneState = SCENE_STATES.SETUP;
    this.sceneSuccesses = 0;
    this.sceneFailures = 0;
    this.failedScenes = 0; // Tracks failures for final scene penalty
    this.created = new Date();
    this.lastActivityAt = new Date(); // Track last activity for leave command
    this.locked = false;
    this.questDefined = false;
    this.questHost = null; // Player who will provide final outcome
    this.startedBy = null; // Player who ran /begin
    this.openingScene = null; // Scene description from /begin
    
    // Truth tracking per scene
    this.sceneTruths = {}; // { scene: { userId: truthText } }
    this.currentSceneTruths = {}; // Reset each scene
    
    // Epilogue tracking
    this.epilogueResponses = {};
    this.epiloguePhase = false;
    this.finaleContent = null; // Finale description from host

    // Per-adventure player objects (for legacy compatibility)
    this.players = {};
    
    // Track trait usage per adventure (not global)
    this.adventureTraitUsage = {};
    this.participants.forEach(playerId => {
      this.adventureTraitUsage[playerId] = {
        conviction: false,
        talent: false,
        quirk: false
      };
    });

    // Track narrative turn flow
    this.narrative = {
      lastPlayer: null,           // Who went last (can't follow yourself)
      pendingResolution: null,    // Roll result that needs resolving
      turnHistory: [],           // History of narrative turns
      waitingForFirstTurn: true, // Scene needs opening turn
      pendingTransition: null,   // Scene completion waiting for but/therefore transition
      turnLock: null,            // Prevent simultaneous turns
      transitionLock: null       // Prevent simultaneous transitions
    };
  }

  /**
   * Check if user is a participant
   * @param {string} userId - User ID to check
   * @returns {boolean} - Whether user is participant
   */
  isParticipant(userId) {
    return this.participants.includes(userId);
  }

  /**
   * Add a new participant to an already-started adventure (via invite)
   * @param {string} userId - User ID to add
   * @returns {Object} - Result
   */
  addParticipant(userId) {
    if (this.isParticipant(userId)) {
      return { success: false, error: 'That player is already in this adventure.' };
    }
    if (this.phase !== ADVENTURE_PHASES.PLAYING) {
      return { success: false, error: 'Players can only be invited during an active adventure.' };
    }
    this.participants.push(userId);
    if (!this.adventureTraitUsage[userId]) {
      this.adventureTraitUsage[userId] = {};
    }
    return { success: true };
  }

  /**
   * Check if adventure can be started (requires complete characters)
   * @param {GameStorage} gameStorage - Game storage to check character completion
   * @returns {Object} - Validation result
   */
  canStart(gameStorage) {
    if (this.participants.length < GAME_CONSTANTS.MIN_PLAYERS) {
      return {
        can: false,
        reason: `Need at least ${GAME_CONSTANTS.MIN_PLAYERS} players to start. Current: ${this.participants.length}`
      };
    }

    if (this.phase !== ADVENTURE_PHASES.WAITING) {
      return {
        can: false,
        reason: 'Adventure has already been started or completed'
      };
    }

    // Check if all participants have complete characters
    const incompleteCharacters = this.participants.filter(userId => 
      !gameStorage.hasCompleteCharacter(userId)
    );
    
    if (incompleteCharacters.length > 0) {
      return {
        can: false,
        reason: `${incompleteCharacters.length} player(s) need to complete their character creation first. Use /conviction, /talent, and /quirk commands.`,
        incompleteCharacters
      };
    }

    return { can: true };
  }

  /**
   * Begin the adventure (start immediately if characters are complete)
   * @param {GameStorage} gameStorage - Game storage for character validation
   * @param {string} sceneDescription - Opening scene description
   * @returns {Object} - Success result
   */
  begin(gameStorage, sceneDescription, userId) {
    const canStartResult = this.canStart(gameStorage);
    if (!canStartResult.can) {
      return {
        success: false,
        error: canStartResult.reason,
        incompleteCharacters: canStartResult.incompleteCharacters
      };
    }

    this.phase = ADVENTURE_PHASES.PLAYING;
    this.locked = true;
    this.currentPhase = SETUP_PHASES.COMPLETE;
    this.scene = 1;
    this.sceneState = SCENE_STATES.ACTIVE;
    this.openingScene = sceneDescription;
    this.startedBy = userId || null;

    return {
      success: true,
      message: `Adventure started! ${sceneDescription}`,
      openingScene: sceneDescription
    };
  }

  /**
   * Declare a truth about the current scene
   * @param {string} userId - User declaring the truth
   * @param {string} truthDescription - The truth being declared
   * @returns {Object} - Result
   */
  declareTruth(userId, truthDescription) {
    // Update activity timestamp
    this.lastActivityAt = new Date();
    
    if (!this.isParticipant(userId)) {
      return {
        success: false,
        error: 'You are not a participant in this adventure! Only the original participants who were in the job when it started can declare truths.'
      };
    }

    if (this.phase !== ADVENTURE_PHASES.PLAYING) {
      return {
        success: false,
        error: 'Adventure must be active to declare truths!'
      };
    }

    // Check if player has already used their truth for this scene
    if (this.currentSceneTruths[userId]) {
      return {
        success: false,
        error: `You have already declared your truth for Scene ${this.scene}! Each player gets 1 truth per scene.`
      };
    }

    // Add the truth
    this.currentSceneTruths[userId] = {
      description: truthDescription.trim(),
      timestamp: new Date()
    };

    // Store in permanent scene record
    if (!this.sceneTruths[this.scene]) {
      this.sceneTruths[this.scene] = {};
    }
    this.sceneTruths[this.scene][userId] = this.currentSceneTruths[userId];

    return {
      success: true,
      truth: this.currentSceneTruths[userId]
    };
  }

  /**
   * Reset adventure trait usage (for new adventures)
   */
  resetAdventureTraitUsage() {
    this.participants.forEach(playerId => {
      this.adventureTraitUsage[playerId] = {
        conviction: false,
        talent: false,
        quirk: false
      };
    });
  }

  /**
   * Get trait usage status for a player in this adventure
   * @param {string} userId - User ID
   * @returns {Object} - Trait usage status
   */
  getPlayerTraitUsage(userId) {
    return this.adventureTraitUsage[userId] || {
      conviction: false,
      talent: false,
      quirk: false
    };
  }

  /**
   * Clean up stale turn locks (older than 30 seconds)
   */
  cleanupStaleTurnLock() {
    if (this.narrative.turnLock) {
      const lockAge = Date.now() - new Date(this.narrative.turnLock.timestamp).getTime();
      const LOCK_TIMEOUT = 30000; // 30 seconds
      
      if (lockAge > LOCK_TIMEOUT) {
        console.warn(`Clearing stale turn lock for player ${this.narrative.turnLock.playerId} (age: ${lockAge}ms)`);
        this.narrative.turnLock = null;
        return true;
      }
    }
    return false;
  }

  /**
   * Clean up stale transition locks (older than 30 seconds)
   */
  cleanupStaleTransitionLock() {
    if (this.narrative.transitionLock) {
      const lockAge = Date.now() - new Date(this.narrative.transitionLock.timestamp).getTime();
      const LOCK_TIMEOUT = 30000; // 30 seconds
      
      if (lockAge > LOCK_TIMEOUT) {
        console.warn(`Clearing stale transition lock for player ${this.narrative.transitionLock.playerId} (age: ${lockAge}ms)`);
        this.narrative.transitionLock = null;
        return true;
      }
    }
    return false;
  }

  /**
   * Clean up all stale locks (useful for maintenance)
   */
  cleanupStaleLocks() {
    const turnLockCleared = this.cleanupStaleTurnLock();
    const transitionLockCleared = this.cleanupStaleTransitionLock();
    
    return {
      turnLockCleared,
      transitionLockCleared,
      anyCleared: turnLockCleared || transitionLockCleared
    };
  }

  /**
   * Handle narrative turn - resolve previous result and take new action
   * @param {string} userId - User ID taking the turn
   * @param {string} narrative - Combined resolution + action text
   * @param {string} traitType - Optional trait to use for +2 bonus
   * @param {GameStorage} gameStorage - Game storage to access global characters
   * @returns {Object} - Turn result
   */
  takeTurn(userId, narrative, traitType = null, gameStorage) {
    // Clean up any stale locks first
    this.cleanupStaleTurnLock();
    
    // Update activity timestamp
    this.lastActivityAt = new Date();

    // Check for turn lock to prevent race conditions
    if (this.narrative.turnLock) {
      return {
        success: false,
        error: `Another player is currently taking their turn. Please wait a moment and try again.`
      };
    }

    // Set turn lock immediately
    this.narrative.turnLock = {
      playerId: userId,
      timestamp: new Date()
    };

    try {
      // Validate player can take turn
      if (!this.isParticipant(userId)) {
        this.narrative.turnLock = null; // Clear lock on error
        return {
          success: false,
          error: 'You are not a participant in this adventure! Only the original participants who were in the job when it started can take turns.'
        };
      }

      if (this.phase !== ADVENTURE_PHASES.PLAYING) {
        this.narrative.turnLock = null; // Clear lock on error
        return {
          success: false,
          error: 'Adventure must be active to take turns!'
        };
      }

      // Check if scene is waiting for transition
      if (this.narrative.pendingTransition) {
        this.narrative.turnLock = null; // Clear lock on error
        const completingPlayer = this.narrative.pendingTransition.completingPlayer;
        return {
          success: false,
          error: `Scene completed! Waiting for <@${completingPlayer}> to provide scene transition using \`/transition\`.`
        };
      }

      if (this.narrative.lastPlayer === userId) {
        this.narrative.turnLock = null; // Clear lock on error
        return {
          success: false,
          error: 'You cannot take two turns in a row! Wait for another player to go.'
        };
      }

      // Validate narrative input
      if (!narrative || narrative.trim().length < 10) {
        this.narrative.turnLock = null; // Clear lock on error
        return {
          success: false,
          error: 'Please provide a more detailed narrative (at least 10 characters).'
        };
      }

      // Make the roll for their action
      const rollResult = this.rollDice(userId, traitType, gameStorage);
      if (!rollResult.success) {
        this.narrative.turnLock = null; // Clear lock on error
        return rollResult; // Pass through roll errors
      }

      // Get narrative prompts based on outcome
      const narrativePrompt = this.getNarrativePrompt(rollResult.outcome, rollResult.total);

      // Record the turn
      const turn = {
        player: userId,
        narrative: narrative.trim(),
        roll: rollResult,
        timestamp: new Date(),
        turnNumber: this.narrative.turnHistory.length + 1
      };
      
      this.narrative.turnHistory.push(turn);
      this.narrative.lastPlayer = userId;
      this.narrative.pendingResolution = rollResult;
      this.narrative.waitingForFirstTurn = false;

      // Clear turn lock after successful completion
      this.narrative.turnLock = null;

      return {
        success: true,
        turn: turn,
        narrativePrompt: narrativePrompt,
        nextPlayerPrompt: this.getNextPlayerPrompt(rollResult),
        sceneStatus: {
          scene: this.scene,
          successes: this.sceneSuccesses,
          failures: this.sceneFailures,
          complete: rollResult.scene.complete,
          result: rollResult.scene.result
        }
      };
    } catch (error) {
      // Clear lock on any unexpected error
      this.narrative.turnLock = null;
      throw error;
    }
  }

  /**
   * Get narrative interpretation prompt for roll outcome
   * @param {string} outcome - Roll outcome (success/partial/failure)
   * @param {number} total - Total roll value
   * @returns {Object} - Narrative guidance
   */
  getNarrativePrompt(outcome, total) {
    switch (outcome) {
      case 'success':
        return {
          type: 'Yes, and...',
          description: `Strong success! Your action works perfectly and provides an additional benefit or advantage.`,
          examples: ['You succeed completely', 'It works better than expected', 'You gain an extra advantage']
        };
      case 'partial':
        return {
          type: 'Yes, but...',
          description: `Partial success! Your action works but with a complication, cost, or unexpected consequence.`,
          examples: ['You succeed but create a new problem', 'It works but takes longer/costs more', 'Success with an unwanted side effect']
        };
      case 'failure':
        return {
          type: 'No, and...',
          description: `Failure with consequence! Your action doesn't work and makes things worse.`,
          examples: ['You fail and alert enemies', 'It backfires spectacularly', 'You fail and lose something valuable']
        };
      default:
        return {
          type: 'Unexpected',
          description: 'Something unexpected happens...'
        };
    }
  }

  /**
   * Get prompt for the next player
   * @param {Object} rollResult - Previous roll result
   * @returns {string} - Prompt for next player
   */
  getNextPlayerPrompt(rollResult) {
    const prompt = this.getNarrativePrompt(rollResult.outcome, rollResult.total);
    
    return `🎲 **${prompt.type}** (${rollResult.total})\n\n` +
           `${prompt.description}\n\n` +
           `**Next player:** Resolve this result and describe your action!\n` +
           `*Use \`/turn "Resolution and action"\` with optional trait*`;
  }

  /**
   * Handle scene transition with outcome declaration and but/therefore statement
   * @param {string} userId - User ID providing the transition
   * @param {string} outcome - Scene outcome ('success' or 'failure')
   * @param {string} transition - The full transition statement with but and therefore
   * @returns {Object} - Transition result
   */
  handleSceneTransition(userId, transitionStatement) {
    // Clean up any stale locks first
    this.cleanupStaleTransitionLock();
    
    // Update activity timestamp
    this.lastActivityAt = new Date();

    // Check for transition lock to prevent race conditions
    if (this.narrative.transitionLock) {
      return {
        success: false,
        error: `Scene transition is already being processed. Please wait a moment and try again.`
      };
    }

    // Validate there's a pending transition
    if (!this.narrative.pendingTransition) {
      return {
        success: false,
        error: 'No scene transition is currently pending!'
      };
    }

    // Validate it's the completing player
    if (this.narrative.pendingTransition.completingPlayer !== userId) {
      const completingPlayer = this.narrative.pendingTransition.completingPlayer;
      return {
        success: false,
        error: `Only <@${completingPlayer}> can provide the scene transition (they completed the scene).`
      };
    }

    // Set transition lock
    this.narrative.transitionLock = {
      playerId: userId,
      timestamp: new Date()
    };

    try {
      const transition = transitionStatement.trim();
      
      // Auto-detect outcome from scene status
      const sceneResult = this.sceneSuccesses >= 3 ? 'success' : 'failure';
      
      // Store the completed transition
      const transitionRecord = {
        userId,
        sceneResult,
        transition,
        timestamp: new Date()
      };

      // Advance the scene
      const advancementResult = this.advanceScene(sceneResult === 'success');
      
      // Clear pending transition and lock
      this.narrative.pendingTransition = null;
      this.narrative.transitionLock = null;

      return {
        success: true,
        transition: transitionRecord,
        sceneAdvancement: advancementResult
      };
    } catch (error) {
      // Clear lock on error
      this.narrative.transitionLock = null;
      console.error('Error in handleSceneTransition:', error);
      console.error('Adventure state:', {
        scene: this.scene,
        sceneState: this.sceneState,
        phase: this.phase,
        pendingTransition: this.narrative.pendingTransition
      });
      throw error;
    }
  }

  /**
   * Get transition prompt for completing player
   * @param {Object} pendingTransition - The pending transition data
   * @returns {string} - Prompt for transition
   */
  getTransitionPrompt(pendingTransition) {
    const sceneResult = pendingTransition.sceneResult;
    const sceneNumber = pendingTransition.sceneNumber;
    const rolls = pendingTransition.rollsSummary;
    
    const outcomeText = sceneResult === 'success' ? 'SUCCESS' : 'FAILURE';
    const outcomeEmoji = sceneResult === 'success' ? '🎉' : '💥';
    
    return `${outcomeEmoji} **Scene ${sceneNumber} ${outcomeText}!** (${rolls.successes} successes, ${rolls.failures} failures)\n\n` +
           `<@${pendingTransition.completingPlayer}>, describe the transition: "[How it plays out], but [complication], therefore [next scene]"\n\n` +
           `*Use \`/transition "[statement]"\`*`;
  }

  /**
   * Reset narrative state for new scene
   */
  resetNarrativeForNewScene() {
    this.narrative.lastPlayer = null;
    this.narrative.pendingResolution = null;
    this.narrative.waitingForFirstTurn = true;
    this.narrative.pendingTransition = null;
    this.currentSceneTruths = {}; // Reset truth usage for new scene
  }

  /**
   * Roll dice with optional trait bonus
   * @param {string} userId - User ID making the roll
   * @param {string} traitType - Optional trait to use for +2 bonus
   * @param {GameStorage} gameStorage - Game storage to access global characters
   * @returns {Object} - Roll result
   */
  rollDice(userId, traitType = null, gameStorage) {
    const player = gameStorage.getPlayer(userId);
    if (!player) {
      return {
        success: false,
        error: 'Player character not found'
      };
    }

    // Roll 2d6
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    let total = die1 + die2;
    let bonus = 0;
    let traitUsed = null;

    // Apply trait bonus if specified
    if (traitType) {
      // Check if trait has already been used this adventure
      if (this.adventureTraitUsage[userId] && this.adventureTraitUsage[userId][traitType]) {
        return {
          success: false,
          error: `You have already used your ${traitType} trait this adventure!`
        };
      }

      // Check if player has this trait
      const characterSheet = player.getCharacterSheet();
      if (!characterSheet[traitType]) {
        return {
          success: false,
          error: `You don't have a ${traitType} trait defined! Use /${traitType} to set it.`
        };
      }

      // Use the trait
      bonus = 2;
      total += bonus;
      traitUsed = {
        type: traitType,
        description: characterSheet[traitType]
      };

      // Mark trait as used for this adventure
      if (!this.adventureTraitUsage[userId]) {
        this.adventureTraitUsage[userId] = {};
      }
      this.adventureTraitUsage[userId][traitType] = true;
    }

    // Determine result (5- fail, 6-8 partial, 9+ success)
    let outcome = 'partial';
    if (total <= GAME_CONSTANTS.FAILURE_THRESHOLD) {
      outcome = 'failure';
      this.sceneFailures++;
    } else if (total >= GAME_CONSTANTS.SUCCESS_THRESHOLD) {
      outcome = 'success';
      this.sceneSuccesses++;
    }

    // Check if scene is complete
    let sceneComplete = false;
    let sceneResult = null;
    if (this.sceneSuccesses >= 3) {
      sceneComplete = true;
      sceneResult = 'success';
      this.sceneState = SCENE_STATES.TRANSITION;
      this.narrative.pendingTransition = {
        completingPlayer: userId,
        sceneResult: 'success',
        sceneNumber: this.scene,
        rollsSummary: {
          successes: this.sceneSuccesses,
          failures: this.sceneFailures
        }
      };
    } else if (this.sceneFailures >= 3) {
      sceneComplete = true;
      sceneResult = 'failure';
      this.sceneState = SCENE_STATES.TRANSITION;
      this.narrative.pendingTransition = {
        completingPlayer: userId,
        sceneResult: 'failure',
        sceneNumber: this.scene,
        rollsSummary: {
          successes: this.sceneSuccesses,
          failures: this.sceneFailures
        }
      };
    }

    return {
      success: true,
      dice: [die1, die2],
      bonus,
      total,
      outcome,
      traitUsed,
      scene: {
        successes: this.sceneSuccesses,
        failures: this.sceneFailures,
        complete: sceneComplete,
        result: sceneResult
      }
    };
  }

  /**
   * Advance to next scene
   * @param {boolean} sceneSuccess - Whether previous scene succeeded
   * @returns {Object} - Scene transition result
   */
  advanceScene(sceneSuccess) {
    // Check if we're completing the final scene
    if (this.scene >= GAME_CONSTANTS.MAX_SCENES) {
      // Final scene is complete - mark adventure as completed but don't start epilogue yet
      this.phase = ADVENTURE_PHASES.COMPLETED;
      
      return {
        success: true,
        adventureComplete: true,
        finalSceneComplete: true,
        result: sceneSuccess ? 'success' : 'failure',
        message: sceneSuccess ? 
          'The final challenge has been overcome! The story reaches its climax!' : 
          'The final challenge proved insurmountable. The story ends in tragedy.',
        needsQuestHostOutcome: true // Signal that Host needs to provide final outcome
      };
    }

    if (!sceneSuccess) {
      this.failedScenes++;
    }

    // Check if adventure failed due to too many scene failures
    if (this.failedScenes >= 3) {
      this.phase = ADVENTURE_PHASES.COMPLETED;
      return {
        success: true,
        adventureComplete: true,
        result: 'failure',
        message: 'Adventure failed! Too many scenes lost.',
        needsQuestHostOutcome: true
      };
    }

    // Advance to next scene
    const previousScene = this.scene;
    this.scene++;
    
    // Check if this is the final scene
    if (this.scene >= GAME_CONSTANTS.MAX_SCENES) {
      // Final scene - apply failed scene penalties
      this.sceneFailures = this.failedScenes;
      this.sceneSuccesses = 0;
      this.sceneState = SCENE_STATES.ACTIVE;
      
      return {
        success: true,
        finalScene: true,
        actTransition: this.getActTransitionMessage(previousScene, this.scene),
        startingFailures: this.failedScenes,
        message: `Final scene begins with ${this.failedScenes} failure(s) already counted!`
      };
    }

    // Regular scene transition
    this.sceneState = SCENE_STATES.SETUP;
    this.sceneSuccesses = 0;
    this.sceneFailures = 0;
    
    // Reset narrative for new scene
    this.resetNarrativeForNewScene();

    return {
      success: true,
      scene: this.scene,
      actTransition: this.getActTransitionMessage(previousScene, this.scene),
      message: `Scene ${this.scene} begins!`
    };
  }

  /**
   * Get enhanced act transition message
   * @param {number} fromScene - Previous scene number
   * @param {number} toScene - New scene number
   * @returns {string|null} - Transition message if it's a major act transition
   */
  getActTransitionMessage(fromScene, toScene) {
    if (fromScene === 1 && toScene === 2) {
      return '🎭 **Act I → Act II**: The initial challenge leads to greater complications...';
    } else if (fromScene === 2 && toScene === 3) {
      return '⚡ **Act II → Act III**: The situation escalates as the true scope of the story becomes clear...';
    } else if (fromScene === 3 && toScene === 4) {
      return '🔥 **Act III → Act IV**: The climax approaches! Everything leads to this final confrontation...';
    }
    return null;
  }

  /**
   * Complete the adventure
   * @param {boolean} finalSceneSuccess - Whether final scene succeeded
   * @returns {Object} - Adventure completion result
   */
  completeAdventure(finalSceneSuccess) {
    this.phase = ADVENTURE_PHASES.COMPLETED;
    
    return {
      success: true,
      result: finalSceneSuccess ? 'success' : 'failure',
      failedScenes: this.failedScenes,
      message: finalSceneSuccess ? 
        'Adventure completed successfully!' : 
        'Adventure ended in failure.'
    };
  }

  /**
   * Begin epilogue phase after adventure completion
   * @param {string} questHostId - ID of player designated as Quest Host
   * @returns {Object} - Epilogue initialization result
   */
  beginEpilogue(questHostId) {
    if (this.phase !== ADVENTURE_PHASES.COMPLETED) {
      return {
        success: false,
        error: 'Adventure must be completed to begin epilogue'
      };
    }
    
    this.epiloguePhase = true;
    this.questHost = questHostId;
    this.sceneState = SCENE_STATES.EPILOGUE;
    
    // Initialize epilogue tracking
    this.participants.forEach(userId => {
      this.epilogueResponses[userId] = null;
    });
    
    return {
      success: true,
      questHost: questHostId
    };
  }
  
  /**
   * Add an epilogue response from a player
   * @param {string} userId - Player ID
   * @param {string} type - Type of response (growth, thread, hook)
   * @param {string} content - Response content
   * @returns {Object} - Result
   */
  addEpilogueResponse(userId, type, content) {
    if (!this.epiloguePhase) {
      return {
        success: false,
        error: 'Adventure is not in epilogue phase'
      };
    }
    
    if (!this.isParticipant(userId)) {
      return {
        success: false,
        error: 'You are not a participant in this adventure! Only the original participants can provide epilogue responses.'
      };
    }
    
    if (this.epilogueResponses[userId]) {
      return {
        success: false,
        error: 'You have already submitted your epilogue response'
      };
    }
    
    if (!Object.values(EPILOGUE_TYPES).includes(type)) {
      return {
        success: false,
        error: 'Invalid epilogue response type'
      };
    }
    
    this.epilogueResponses[userId] = {
      type,
      content: content.trim(),
      timestamp: new Date()
    };
    
    // Check if all players have responded
    const completedResponses = Object.values(this.epilogueResponses)
      .filter(response => response !== null).length;
    const allComplete = completedResponses === this.participants.length;
    
    return {
      success: true,
      response: this.epilogueResponses[userId],
      allComplete,
      remainingCount: this.participants.length - completedResponses
    };
  }
  
  /**
   * Get epilogue status
   * @returns {Object} - Epilogue progress
   */
  getEpilogueStatus() {
    if (!this.epiloguePhase) {
      return { active: false };
    }
    
    const responses = Object.entries(this.epilogueResponses)
      .map(([userId, response]) => ({ userId, response }));
    
    const completed = responses.filter(r => r.response !== null);
    const pending = responses.filter(r => r.response === null);
    
    return {
      active: true,
      questHost: this.questHost,
      completed: completed.length,
      total: this.participants.length,
      allComplete: completed.length === this.participants.length,
      responses: completed,
      pendingPlayers: pending.map(p => p.userId)
    };
  }

  /**
   * Get character sheet for a player (deprecated - use player.getCharacterSheet())
   * @param {string} userId - Player user ID
   * @returns {Object|null} - Character data or null if not participant
   */
  getCharacterSheet(userId) {
    const player = this.getPlayer(userId);
    return player ? player.getCharacterSheet() : null;
  }

  /**
   * Reset all player traits for new adventure
   */
  resetPlayerTraits() {
    Object.values(this.players).forEach(player => {
      player.resetTraitUsage();
    });
  }

  /**
   * Check if scene should transition to next phase
   * @returns {Object} - Scene transition information
   */
  checkSceneTransition() {
    if (this.sceneSuccesses >= 3) {
      return { shouldTransition: true, result: 'success' };
    }
    if (this.sceneFailures >= 3) {
      return { shouldTransition: true, result: 'failure' };
    }
    return { shouldTransition: false };
  }

  /**
   * Get adventure status
   * @returns {Object} - Adventure status
   */
  getStatus() {
    return {
      id: this.id,
      phase: this.phase,
      currentPhase: this.currentPhase,
      scene: this.scene,
      maxScenes: GAME_CONSTANTS.MAX_SCENES,
      sceneState: this.sceneState,
      sceneSuccesses: this.sceneSuccesses,
      sceneFailures: this.sceneFailures,
      failedScenes: this.failedScenes,
      participants: [...this.participants],
      locked: this.locked,
      created: this.created
    };
  }

  /**
   * Get character creation progress
   * @returns {Object} - Progress information
   */
  getCharacterCreationProgress() {
    const completed = this.participants.filter(userId => {
      const player = this.getPlayer(userId);
      return player && player.isCharacterComplete();
    });

    return {
      completed: completed.length,
      total: this.participants.length,
      ready: completed.length === this.participants.length,
      completedPlayers: completed
    };
  }

  /**
   * Serialize adventure for storage
   * @returns {Object} - Serializable object
   */
  toJSON() {
    // Serialize player objects
    const playersData = {};
    Object.entries(this.players).forEach(([userId, player]) => {
      playersData[userId] = player.toJSON();
    });

    return {
      id: this.id,
      threadId: this.threadId,
      jobId: this.jobId,
      participants: this.participants,
      phase: this.phase,
      currentPhase: this.currentPhase,
      scene: this.scene,
      sceneState: this.sceneState,
      sceneSuccesses: this.sceneSuccesses,
      sceneFailures: this.sceneFailures,
      failedScenes: this.failedScenes,
      created: this.created,
      locked: this.locked,
      questDefined: this.questDefined,
      questHost: this.questHost,
      openingScene: this.openingScene,
      sceneTruths: this.sceneTruths,
      currentSceneTruths: this.currentSceneTruths,
      epilogueResponses: this.epilogueResponses,
      epiloguePhase: this.epiloguePhase,
      finaleContent: this.finaleContent,
      lastActivityAt: this.lastActivityAt,
      startedBy: this.startedBy || null,
      players: playersData,
      adventureTraitUsage: this.adventureTraitUsage,
      narrative: this.narrative
    };
  }

  /**
   * Create Adventure from serialized data
   * @param {Object} data - Serialized adventure data
   * @returns {Adventure} - Adventure instance
   */
  static fromJSON(data) {
    const adventure = Object.create(Adventure.prototype);
    
    // Set basic properties
    Object.assign(adventure, {
      id: data.id,
      threadId: data.threadId,
      jobId: data.jobId,
      participants: data.participants,
      phase: data.phase,
      currentPhase: data.currentPhase,
      scene: data.scene,
      sceneState: data.sceneState || SCENE_STATES.SETUP,
      sceneSuccesses: data.sceneSuccesses || 0,
      sceneFailures: data.sceneFailures || 0,
      failedScenes: data.failedScenes || 0,
      created: new Date(data.created),
      locked: data.locked,
      questDefined: data.questDefined,
      questHost: data.questHost || null,
      openingScene: data.openingScene || null,
      sceneTruths: data.sceneTruths || {},
      currentSceneTruths: data.currentSceneTruths || {},
      epilogueResponses: data.epilogueResponses || {},
      epiloguePhase: data.epiloguePhase || false,
      finaleContent: data.finaleContent || null,
      lastActivityAt: data.lastActivityAt ? new Date(data.lastActivityAt) : new Date(),
      startedBy: data.startedBy || null,
      adventureTraitUsage: data.adventureTraitUsage || {},
      narrative: data.narrative || {
        lastPlayer: null,
        pendingResolution: null,
        turnHistory: [],
        waitingForFirstTurn: true,
        pendingTransition: null,
        turnLock: null,
        transitionLock: null
      }
    });

    // Restore player objects
    adventure.players = {};
    if (data.players) {
      Object.entries(data.players).forEach(([userId, playerData]) => {
        adventure.players[userId] = Player.fromJSON(playerData);
      });
    } else {
      // Fallback for legacy data - create empty players
      adventure.participants.forEach(userId => {
        adventure.players[userId] = new Player(userId, adventure.id);
      });
    }

    return adventure;
  }
}