import { 
  ADVENTURE_PHASES, 
  SETUP_PHASES, 
  CHARACTER_TRAITS, 
  GAME_CONSTANTS,
  SCENE_STATES
} from '../config/constants.js';
import { 
  generateAdventureId, 
  deduplicate
} from '../utils/gameHelpers.js';

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
    this.locked = false;
    this.questDefined = false;
    
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
      pendingTransition: null    // Scene completion waiting for but/therefore transition
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
   * @returns {Object} - Success result
   */
  begin(gameStorage) {
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

    return {
      success: true,
      message: 'Adventure started! All characters are ready. Scene 1 begins...'
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
   * Handle narrative turn - resolve previous result and take new action
   * @param {string} userId - User ID taking the turn
   * @param {string} narrative - Combined resolution + action text
   * @param {string} traitType - Optional trait to use for +2 bonus
   * @param {GameStorage} gameStorage - Game storage to access global characters
   * @returns {Object} - Turn result
   */
  takeTurn(userId, narrative, traitType = null, gameStorage) {
    // Validate player can take turn
    if (!this.isParticipant(userId)) {
      return {
        success: false,
        error: 'You are not a participant in this adventure!'
      };
    }

    if (this.phase !== ADVENTURE_PHASES.PLAYING) {
      return {
        success: false,
        error: 'Adventure must be active to take turns!'
      };
    }

    // Check if scene is waiting for transition
    if (this.narrative.pendingTransition) {
      const completingPlayer = this.narrative.pendingTransition.completingPlayer;
      return {
        success: false,
        error: `Scene completed! Waiting for <@${completingPlayer}> to provide scene transition using \`/transition\`.`
      };
    }

    if (this.narrative.lastPlayer === userId) {
      return {
        success: false,
        error: 'You cannot take two turns in a row! Wait for another player to go.'
      };
    }

    // Validate narrative input
    if (!narrative || narrative.trim().length < 10) {
      return {
        success: false,
        error: 'Please provide a more detailed narrative (at least 10 characters).'
      };
    }

    // If there's a pending resolution, player should address it
    if (this.narrative.pendingResolution && !this.narrative.waitingForFirstTurn) {
      const pendingOutcome = this.narrative.pendingResolution.outcome;
      const hasResolutionWords = /\b(but|and|however|although|though|yet|still|nevertheless)\b/i.test(narrative);
      
      if (!hasResolutionWords && pendingOutcome !== 'success') {
        return {
          success: false,
          error: `Please resolve the previous ${pendingOutcome} roll before your action. Use words like "but", "and", "however" to address what happened.`
        };
      }
    }

    // Make the roll for their action
    const rollResult = this.rollDice(userId, traitType, gameStorage);
    if (!rollResult.success) {
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
  handleSceneTransition(userId, outcome, transition) {
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

    // Validate outcome
    if (!outcome || !['success', 'failure'].includes(outcome.toLowerCase())) {
      return {
        success: false,
        error: 'You must declare the scene outcome as either "success" or "failure".'
      };
    }

    // Validate transition contains both but AND therefore
    const transitionText = transition.trim();
    const hasBut = /\b(but|however|although|yet|unfortunately|sadly)\b/i.test(transitionText);
    const hasTherefore = /\b(therefore|so|thus|consequently|as a result|which means|leading to)\b/i.test(transitionText);
    
    if (!hasBut || !hasTherefore) {
      return {
        success: false,
        error: 'Scene transitions must include BOTH "but" (complication) AND "therefore" (next scene setup) elements! Example: "The scene succeeds, but the noise attracts guards, therefore we must now escape before being caught."'
      };
    }

    const sceneOutcome = outcome.toLowerCase() === 'success';
    
    // Apply the transition and advance scene
    const transitionResult = this.advanceScene(sceneOutcome);
    
    // Record the transition in history
    const transitionRecord = {
      player: userId,
      declaredOutcome: outcome.toLowerCase(),
      transition: transitionText,
      fromScene: this.narrative.pendingTransition.sceneNumber,
      toScene: this.scene,
      rollsSummary: this.narrative.pendingTransition.rollsSummary,
      timestamp: new Date()
    };

    // Clear the pending transition
    this.narrative.pendingTransition = null;
    
    return {
      success: true,
      transition: transitionRecord,
      sceneAdvancement: transitionResult
    };
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
           `<@${pendingTransition.completingPlayer}>, your roll completed the scene with a ${sceneResult}!\n\n` +
           `**Now describe the transition using this format:**\n` +
           `"[How the ${sceneResult} plays out], but [complication], therefore [next scene setup]"\n\n` +
           `*Use \`/transition "[Full transition statement]"\`*\n\n` +
           `**Example:** \`/transition "We escape the castle successfully, but the alarm brings reinforcements, therefore we must now outrun pursuing guards through the forest"\``;
  }

  /**
   * Reset narrative state for new scene
   */
  resetNarrativeForNewScene() {
    this.narrative.lastPlayer = null;
    this.narrative.pendingResolution = null;
    this.narrative.waitingForFirstTurn = true;
    this.narrative.pendingTransition = null;
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
      // Final scene is complete - end the adventure
      this.phase = ADVENTURE_PHASES.COMPLETED;
      return {
        success: true,
        adventureComplete: true,
        result: sceneSuccess ? 'success' : 'failure',
        message: sceneSuccess ? 
          'Adventure completed successfully! The final challenge was overcome!' : 
          'Adventure ended in failure. The final challenge proved too difficult.'
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
        message: 'Adventure failed! Too many scenes lost.'
      };
    }

    // Advance to next scene
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
      message: `Scene ${this.scene} begins!`
    };
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
      adventureTraitUsage: data.adventureTraitUsage || {},
      narrative: data.narrative || {
        lastPlayer: null,
        pendingResolution: null,
        turnHistory: [],
        waitingForFirstTurn: true,
        pendingTransition: null
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