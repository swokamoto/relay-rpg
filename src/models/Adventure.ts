import {
  ADVENTURE_PHASES,
  SETUP_PHASES,
  GAME_CONSTANTS,
  SCENE_STATES,
  EPILOGUE_TYPES,
} from '../config/constants.js';
import { generateAdventureId, deduplicate } from '../utils/gameHelpers.js';
import { Player } from './Player.js';
import type {
  AdventurePhase,
  SetupPhase,
  SceneState,
  TraitType,
  TraitUsageMap,
  TurnLock,
  TruthEntry,
  TurnHistoryEntry,
  NarrativeState,
  AdventureData,
  ActionResult,
  IGameStorage,
} from '../types/index.js';

// ─── Local result shapes ─────────────────────────────────────────────────────

interface CanStartResult {
  can: boolean;
  reason?: string;
  incompleteCharacters?: string[];
}

interface RollResult {
  success: true;
  dice: [number, number];
  bonus: number;
  total: number;
  outcome: string;
  tensionTriggered: boolean;
  traitUsed: { type: string; description: string } | null;
  scene: { successes: number; failures: number; complete: boolean; result: string | null };
}

interface NarrativePrompt {
  type: string;
  description: string;
  examples?: string[];
}

interface EpilogueResponse {
  type: string;
  content: string;
  timestamp: Date;
}

interface PendingTransition {
  completingPlayer: string;
  sceneResult: string;
  sceneNumber: number;
  rollsSummary: { successes: number; failures: number };
}

// ─── Adventure ────────────────────────────────────────────────────────────────

export class Adventure {
  id: string;
  threadId: string;
  jobId: string;
  participants: string[];
  phase: AdventurePhase;
  currentPhase: SetupPhase;
  scene: number;
  sceneState: SceneState;
  sceneSuccesses: number;
  sceneFailures: number;
  consecutivePartials: number;
  failedScenes: number;
  created: Date;
  lastActivityAt: Date;
  locked: boolean;
  questDefined: boolean;
  questHost: string | null;
  startedBy: string | null;
  openingScene: string | null;
  sceneTruths: Record<number, Record<string, TruthEntry>>;
  currentSceneTruths: Record<string, TruthEntry>;
  epilogueResponses: Record<string, EpilogueResponse | null>;
  epiloguePhase: boolean;
  finaleContent: string | null;
  players: Record<string, Player>;
  adventureTraitUsage: Record<string, TraitUsageMap>;
  narrative: NarrativeState;

  constructor(jobId: string, threadId: string, participants: string[]) {
    this.id = generateAdventureId(jobId);
    this.threadId = threadId;
    this.jobId = jobId;
    this.participants = deduplicate(participants) as string[];
    this.phase = ADVENTURE_PHASES.WAITING as AdventurePhase;
    this.currentPhase = SETUP_PHASES.COMPLETE as SetupPhase;
    this.scene = 1;
    this.sceneState = SCENE_STATES.SETUP as SceneState;
    this.sceneSuccesses = 0;
    this.sceneFailures = 0;
    this.consecutivePartials = 0;
    this.failedScenes = 0;
    this.created = new Date();
    this.lastActivityAt = new Date();
    this.locked = false;
    this.questDefined = false;
    this.questHost = null;
    this.startedBy = null;
    this.openingScene = null;
    this.sceneTruths = {};
    this.currentSceneTruths = {};
    this.epilogueResponses = {};
    this.epiloguePhase = false;
    this.finaleContent = null;
    this.players = {};
    this.adventureTraitUsage = {};

    this.participants.forEach((playerId) => {
      this.adventureTraitUsage[playerId] = { conviction: false, talent: false, quirk: false };
    });

    this.narrative = {
      lastPlayer: null,
      pendingResolution: null,
      turnHistory: [],
      waitingForFirstTurn: true,
      pendingTransition: null,
      turnLock: null,
      transitionLock: null,
    };
  }

  isParticipant(userId: string): boolean {
    return this.participants.includes(userId);
  }

  addParticipant(userId: string): ActionResult {
    if (this.isParticipant(userId)) {
      return { success: false, error: 'That player is already in this adventure.' };
    }
    if (this.phase !== ADVENTURE_PHASES.PLAYING) {
      return { success: false, error: 'Players can only be invited during an active adventure.' };
    }
    this.participants.push(userId);
    if (!this.adventureTraitUsage[userId]) {
      this.adventureTraitUsage[userId] = { conviction: false, talent: false, quirk: false };
    }
    return { success: true };
  }

  canStart(gameStorage: IGameStorage): CanStartResult {
    if (this.participants.length < GAME_CONSTANTS.MIN_PLAYERS) {
      return {
        can: false,
        reason: `Need at least ${GAME_CONSTANTS.MIN_PLAYERS} players to start. Current: ${this.participants.length}`,
      };
    }
    if (this.phase !== ADVENTURE_PHASES.WAITING) {
      return { can: false, reason: 'Adventure has already been started or completed' };
    }
    const incompleteCharacters = this.participants.filter(
      (userId) => !gameStorage.hasCompleteCharacter(userId),
    );
    if (incompleteCharacters.length > 0) {
      return {
        can: false,
        reason: `${incompleteCharacters.length} player(s) need to complete their character creation first. Use /conviction, /talent, and /quirk commands.`,
        incompleteCharacters,
      };
    }
    return { can: true };
  }

  begin(
    gameStorage: IGameStorage,
    sceneDescription: string,
    userId: string,
  ): ActionResult<{ message: string; openingScene: string }> {
    const canStartResult = this.canStart(gameStorage);
    if (!canStartResult.can) {
      return { success: false, error: canStartResult.reason ?? 'Cannot start adventure.' };
    }
    this.phase = ADVENTURE_PHASES.PLAYING as AdventurePhase;
    this.locked = true;
    this.currentPhase = SETUP_PHASES.COMPLETE as SetupPhase;
    this.scene = 1;
    this.sceneState = SCENE_STATES.ACTIVE as SceneState;
    this.openingScene = sceneDescription;
    this.startedBy = userId ?? null;
    return {
      success: true,
      message: `Adventure started! ${sceneDescription}`,
      openingScene: sceneDescription,
    };
  }

  declareTruth(userId: string, truthDescription: string): ActionResult<{ truth: TruthEntry }> {
    this.lastActivityAt = new Date();

    if (!this.isParticipant(userId)) {
      return {
        success: false,
        error:
          'You are not a participant in this adventure! Only the original participants who were in the job when it started can declare truths.',
      };
    }
    if (this.phase !== ADVENTURE_PHASES.PLAYING) {
      return { success: false, error: 'Adventure must be active to declare truths!' };
    }
    if (this.currentSceneTruths[userId]) {
      return {
        success: false,
        error: `You have already declared your truth for Scene ${this.scene}! Each player gets 1 truth per scene.`,
      };
    }

    const truth: TruthEntry = { description: truthDescription.trim(), timestamp: new Date() };
    this.currentSceneTruths[userId] = truth;

    if (!this.sceneTruths[this.scene]) {
      this.sceneTruths[this.scene] = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.sceneTruths[this.scene]![userId] = truth;

    return { success: true, truth };
  }

  resetAdventureTraitUsage(): void {
    this.participants.forEach((playerId) => {
      this.adventureTraitUsage[playerId] = { conviction: false, talent: false, quirk: false };
    });
  }

  getPlayerTraitUsage(userId: string): TraitUsageMap {
    return this.adventureTraitUsage[userId] ?? { conviction: false, talent: false, quirk: false };
  }

  cleanupStaleTurnLock(): boolean {
    if (this.narrative.turnLock) {
      const lockAge = Date.now() - new Date(this.narrative.turnLock.timestamp).getTime();
      if (lockAge > 30_000) {
        console.warn(
          `Clearing stale turn lock for player ${this.narrative.turnLock.playerId} (age: ${lockAge}ms)`,
        );
        this.narrative.turnLock = null;
        return true;
      }
    }
    return false;
  }

  cleanupStaleTransitionLock(): boolean {
    if (this.narrative.transitionLock) {
      const lockAge = Date.now() - new Date(this.narrative.transitionLock.timestamp).getTime();
      if (lockAge > 30_000) {
        console.warn(
          `Clearing stale transition lock for player ${this.narrative.transitionLock.playerId} (age: ${lockAge}ms)`,
        );
        this.narrative.transitionLock = null;
        return true;
      }
    }
    return false;
  }

  cleanupStaleLocks(): { turnLockCleared: boolean; transitionLockCleared: boolean; anyCleared: boolean } {
    const turnLockCleared = this.cleanupStaleTurnLock();
    const transitionLockCleared = this.cleanupStaleTransitionLock();
    return { turnLockCleared, transitionLockCleared, anyCleared: turnLockCleared || transitionLockCleared };
  }

  takeTurn(
    userId: string,
    narrative: string,
    traitType: string | null = null,
    gameStorage: IGameStorage,
  ): ActionResult<{
    turn: unknown;
    narrativePrompt: NarrativePrompt;
    nextPlayerPrompt: string;
    sceneStatus: { scene: number; successes: number; failures: number; complete: boolean; result: string | null };
  }> {
    this.cleanupStaleTurnLock();
    this.lastActivityAt = new Date();

    if (this.narrative.turnLock) {
      return {
        success: false,
        error: 'Another player is currently taking their turn. Please wait a moment and try again.',
      };
    }

    this.narrative.turnLock = { playerId: userId, timestamp: new Date() };

    try {
      if (!this.isParticipant(userId)) {
        this.narrative.turnLock = null;
        return {
          success: false,
          error:
            'You are not a participant in this adventure! Only the original participants who were in the job when it started can take turns.',
        };
      }
      if (this.phase !== ADVENTURE_PHASES.PLAYING) {
        this.narrative.turnLock = null;
        return { success: false, error: 'Adventure must be active to take turns!' };
      }
      if (this.narrative.pendingTransition) {
        this.narrative.turnLock = null;
        const pt = this.narrative.pendingTransition as PendingTransition;
        return {
          success: false,
          error: `Scene completed! Waiting for <@${pt.completingPlayer}> to provide scene transition using \`/transition\`.`,
        };
      }
      if (this.narrative.lastPlayer === userId) {
        this.narrative.turnLock = null;
        return { success: false, error: 'You cannot take two turns in a row! Wait for another player to go.' };
      }
      if (!narrative || narrative.trim().length < 10) {
        this.narrative.turnLock = null;
        return { success: false, error: 'Please provide a more detailed narrative (at least 10 characters).' };
      }

      const rollResult = this.rollDice(userId, traitType, gameStorage);
      if (!rollResult.success) {
        this.narrative.turnLock = null;
        return rollResult as ActionResult<never>;
      }

      const narrativePrompt = this.getNarrativePrompt(rollResult.outcome, rollResult.total);
      const turn = {
        player: userId,
        narrative: narrative.trim(),
        roll: rollResult,
        timestamp: new Date(),
        turnNumber: this.narrative.turnHistory.length + 1,
      };

      this.narrative.turnHistory.push(turn as unknown as TurnHistoryEntry);
      this.narrative.lastPlayer = userId;
      this.narrative.pendingResolution = rollResult;
      this.narrative.waitingForFirstTurn = false;
      this.narrative.turnLock = null;

      return {
        success: true,
        turn,
        narrativePrompt,
        nextPlayerPrompt: this.getNextPlayerPrompt(rollResult),
        sceneStatus: {
          scene: this.scene,
          successes: this.sceneSuccesses,
          failures: this.sceneFailures,
          complete: rollResult.scene.complete,
          result: rollResult.scene.result,
        },
      };
    } catch (error) {
      this.narrative.turnLock = null;
      throw error;
    }
  }

  getNarrativePrompt(outcome: string, _total: number): NarrativePrompt {
    switch (outcome) {
      case 'critical_success':
        return {
          type: 'Yes, and then some!',
          description: 'Critical success! Your action works brilliantly and opens up an unexpected advantage or opportunity.',
          examples: ['You exceed all expectations', 'You succeed and gain a major advantage', 'Something goes remarkably right'],
        };
      case 'success':
        return {
          type: 'Yes, and...',
          description: 'Strong success! Your action works perfectly and provides an additional benefit or advantage.',
          examples: ['You succeed completely', 'It works better than expected', 'You gain an extra advantage'],
        };
      case 'partial':
        return {
          type: 'Yes, but...',
          description: 'Partial success! Your action works but with a complication, cost, or unexpected consequence.',
          examples: ['You succeed but create a new problem', 'It works but takes longer/costs more', 'Success with an unwanted side effect'],
        };
      case 'failure':
        return {
          type: 'No, and...',
          description: "Failure with consequence! Your action doesn't work and makes things worse.",
          examples: ['You fail and alert enemies', 'It backfires spectacularly', 'You fail and lose something valuable'],
        };
      case 'critical_failure':
        return {
          type: 'No, and it gets worse!',
          description: 'Critical failure! Your action backfires badly and the situation deteriorates significantly.',
          examples: ['Everything goes wrong at once', 'You fail and create a new serious problem', 'A catastrophic setback'],
        };
      default:
        return { type: 'Unexpected', description: 'Something unexpected happens...' };
    }
  }

  getNextPlayerPrompt(rollResult: RollResult): string {
    const prompt = this.getNarrativePrompt(rollResult.outcome, rollResult.total);
    return (
      `🎲 **${prompt.type}** (${rollResult.total})\n\n` +
      `${prompt.description}\n\n` +
      `**Next player:** Resolve this result and describe your action!\n` +
      `*Use \`/turn "Resolution and action"\` with optional trait*`
    );
  }

  handleSceneTransition(
    userId: string,
    transitionStatement: string,
  ): ActionResult<{ transition: unknown; sceneAdvancement: unknown }> {
    this.cleanupStaleTransitionLock();
    this.lastActivityAt = new Date();

    if (this.narrative.transitionLock) {
      return { success: false, error: 'Scene transition is already being processed. Please wait a moment and try again.' };
    }
    if (!this.narrative.pendingTransition) {
      return { success: false, error: 'No scene transition is currently pending!' };
    }

    const pt = this.narrative.pendingTransition as PendingTransition;
    if (pt.completingPlayer !== userId) {
      return {
        success: false,
        error: `Only <@${pt.completingPlayer}> can provide the scene transition (they completed the scene).`,
      };
    }

    this.narrative.transitionLock = { playerId: userId, timestamp: new Date() };

    try {
      const transition = transitionStatement.trim();
      const sceneResult = this.sceneSuccesses >= 3 ? 'success' : 'failure';
      const transitionRecord = { userId, sceneResult, transition, timestamp: new Date() };
      const advancementResult = this.advanceScene(sceneResult === 'success');
      this.narrative.pendingTransition = null;
      this.narrative.transitionLock = null;
      return { success: true, transition: transitionRecord, sceneAdvancement: advancementResult };
    } catch (error) {
      this.narrative.transitionLock = null;
      console.error('Error in handleSceneTransition:', error);
      throw error;
    }
  }

  getTransitionPrompt(pendingTransition: PendingTransition): string {
    const { sceneResult, sceneNumber, rollsSummary, completingPlayer } = pendingTransition;
    const outcomeText = sceneResult === 'success' ? 'SUCCESS' : 'FAILURE';
    const outcomeEmoji = sceneResult === 'success' ? '🎉' : '💥';
    return (
      `${outcomeEmoji} **Scene ${sceneNumber} ${outcomeText}!** (${rollsSummary.successes} successes, ${rollsSummary.failures} failures)\n\n` +
      `<@${completingPlayer}>, describe the transition: "[How it plays out], but [complication], therefore [next scene]"\n\n` +
      `*Use \`/transition "[statement]"\`*`
    );
  }

  resetNarrativeForNewScene(): void {
    this.narrative.lastPlayer = null;
    this.narrative.pendingResolution = null;
    this.narrative.waitingForFirstTurn = true;
    this.narrative.pendingTransition = null;
    this.currentSceneTruths = {};
  }

  rollDice(
    userId: string,
    traitType: string | null = null,
    gameStorage: IGameStorage,
  ): RollResult | ActionResult<never> {
    const player = gameStorage.getPlayer(userId);
    if (!player) return { success: false, error: 'Player character not found' };

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    let total = die1 + die2;
    let bonus = 0;
    let traitUsed: { type: string; description: string } | null = null;

    if (traitType) {
      const usage = this.adventureTraitUsage[userId];
      if (usage && usage[traitType as TraitType]) {
        return { success: false, error: `You have already used your ${traitType} trait this adventure!` };
      }
      const characterSheet = player.getCharacterSheet();
      const traitDesc = characterSheet[traitType as TraitType];
      if (!traitDesc) {
        return { success: false, error: `You don't have a ${traitType} trait defined! Use /${traitType} to set it.` };
      }
      bonus = 2;
      total += bonus;
      traitUsed = { type: traitType, description: traitDesc as string };
      if (!this.adventureTraitUsage[userId]) {
        this.adventureTraitUsage[userId] = { conviction: false, talent: false, quirk: false };
      }
      (this.adventureTraitUsage[userId] as unknown as Record<string, boolean>)[traitType] = true;
    }

    let outcome = 'partial';
    let tensionTriggered = false;

    if (total <= GAME_CONSTANTS.CRITICAL_FAILURE_THRESHOLD) {
      outcome = 'critical_failure';
      this.sceneFailures = Math.min(this.sceneFailures + 2, 3);
      this.consecutivePartials = 0;
    } else if (total <= GAME_CONSTANTS.FAILURE_THRESHOLD) {
      outcome = 'failure';
      this.sceneFailures++;
      this.consecutivePartials = 0;
    } else if (total >= GAME_CONSTANTS.CRITICAL_SUCCESS_THRESHOLD) {
      outcome = 'critical_success';
      this.sceneSuccesses = Math.min(this.sceneSuccesses + 2, 3);
      this.consecutivePartials = 0;
    } else if (total >= GAME_CONSTANTS.SUCCESS_THRESHOLD) {
      outcome = 'success';
      this.sceneSuccesses++;
      this.consecutivePartials = 0;
    } else {
      this.consecutivePartials++;
      if (this.consecutivePartials >= 3) {
        tensionTriggered = true;
        this.sceneFailures++;
        this.consecutivePartials = 0;
      }
    }

    let sceneComplete = false;
    let sceneResult: string | null = null;

    if (this.sceneSuccesses >= 3) {
      sceneComplete = true;
      sceneResult = 'success';
      this.sceneState = SCENE_STATES.TRANSITION as SceneState;
      this.narrative.pendingTransition = {
        completingPlayer: userId,
        sceneResult: 'success',
        sceneNumber: this.scene,
        rollsSummary: { successes: this.sceneSuccesses, failures: this.sceneFailures },
      } as PendingTransition;
    } else if (this.sceneFailures >= 3) {
      sceneComplete = true;
      sceneResult = 'failure';
      this.sceneState = SCENE_STATES.TRANSITION as SceneState;
      this.narrative.pendingTransition = {
        completingPlayer: userId,
        sceneResult: 'failure',
        sceneNumber: this.scene,
        rollsSummary: { successes: this.sceneSuccesses, failures: this.sceneFailures },
      } as PendingTransition;
    }

    return {
      success: true,
      dice: [die1, die2],
      bonus,
      total,
      outcome,
      tensionTriggered,
      traitUsed,
      scene: { successes: this.sceneSuccesses, failures: this.sceneFailures, complete: sceneComplete, result: sceneResult },
    };
  }

  advanceScene(sceneSuccess: boolean): unknown {
    if (this.scene >= GAME_CONSTANTS.MAX_SCENES) {
      this.phase = ADVENTURE_PHASES.COMPLETED as AdventurePhase;
      return {
        success: true,
        adventureComplete: true,
        finalSceneComplete: true,
        result: sceneSuccess ? 'success' : 'failure',
        message: sceneSuccess
          ? 'The final challenge has been overcome! The story reaches its climax!'
          : 'The final challenge proved insurmountable. The story ends in tragedy.',
        needsQuestHostOutcome: true,
      };
    }

    if (!sceneSuccess) this.failedScenes++;

    if (this.failedScenes >= 3) {
      this.phase = ADVENTURE_PHASES.COMPLETED as AdventurePhase;
      return {
        success: true,
        adventureComplete: true,
        result: 'failure',
        message: 'Adventure failed! Too many scenes lost.',
        needsQuestHostOutcome: true,
      };
    }

    const previousScene = this.scene;
    this.scene++;

    if (this.scene >= GAME_CONSTANTS.MAX_SCENES) {
      this.sceneFailures = this.failedScenes;
      this.sceneSuccesses = 0;
      this.sceneState = SCENE_STATES.ACTIVE as SceneState;
      return {
        success: true,
        finalScene: true,
        actTransition: this.getActTransitionMessage(previousScene, this.scene),
        startingFailures: this.failedScenes,
        message: `Final scene begins with ${this.failedScenes} failure(s) already counted!`,
      };
    }

    this.sceneState = SCENE_STATES.SETUP as SceneState;
    this.sceneSuccesses = 0;
    this.sceneFailures = 0;
    this.consecutivePartials = 0;
    this.resetNarrativeForNewScene();

    return {
      success: true,
      scene: this.scene,
      actTransition: this.getActTransitionMessage(previousScene, this.scene),
      message: `Scene ${this.scene} begins!`,
    };
  }

  getActTransitionMessage(fromScene: number, toScene: number): string | null {
    if (fromScene === 1 && toScene === 2) return '🎭 **Act I → Act II**: The initial challenge leads to greater complications...';
    if (fromScene === 2 && toScene === 3) return '⚡ **Act II → Act III**: The situation escalates as the true scope of the story becomes clear...';
    if (fromScene === 3 && toScene === 4) return '🔥 **Act III → Act IV**: The climax approaches! Everything leads to this final confrontation...';
    return null;
  }

  completeAdventure(finalSceneSuccess: boolean): ActionResult<{ result: string; failedScenes: number; message: string }> {
    this.phase = ADVENTURE_PHASES.COMPLETED as AdventurePhase;
    return {
      success: true,
      result: finalSceneSuccess ? 'success' : 'failure',
      failedScenes: this.failedScenes,
      message: finalSceneSuccess ? 'Adventure completed successfully!' : 'Adventure ended in failure.',
    };
  }

  beginEpilogue(questHostId: string): ActionResult<{ questHost: string }> {
    if (this.phase !== ADVENTURE_PHASES.COMPLETED) {
      return { success: false, error: 'Adventure must be completed to begin epilogue' };
    }
    this.epiloguePhase = true;
    this.questHost = questHostId;
    this.sceneState = SCENE_STATES.EPILOGUE as SceneState;
    this.participants.forEach((userId) => {
      this.epilogueResponses[userId] = null;
    });
    return { success: true, questHost: questHostId };
  }

  addEpilogueResponse(
    userId: string,
    type: string,
    content: string,
  ): ActionResult<{ response: EpilogueResponse; allComplete: boolean; remainingCount: number }> {
    if (!this.epiloguePhase) {
      return { success: false, error: 'Adventure is not in epilogue phase' };
    }
    if (!this.isParticipant(userId)) {
      return {
        success: false,
        error: 'You are not a participant in this adventure! Only the original participants can provide epilogue responses.',
      };
    }
    if (this.epilogueResponses[userId]) {
      return { success: false, error: 'You have already submitted your epilogue response' };
    }
    if (!Object.values(EPILOGUE_TYPES as Record<string, string>).includes(type)) {
      return { success: false, error: 'Invalid epilogue response type' };
    }

    const response: EpilogueResponse = { type, content: content.trim(), timestamp: new Date() };
    this.epilogueResponses[userId] = response;

    const completedResponses = Object.values(this.epilogueResponses).filter((r) => r !== null).length;
    const allComplete = completedResponses === this.participants.length;

    return {
      success: true,
      response,
      allComplete,
      remainingCount: this.participants.length - completedResponses,
    };
  }

  getEpilogueStatus(): unknown {
    if (!this.epiloguePhase) return { active: false };
    const responses = Object.entries(this.epilogueResponses).map(([userId, response]) => ({ userId, response }));
    const completed = responses.filter((r) => r.response !== null);
    const pending = responses.filter((r) => r.response === null);
    return {
      active: true,
      questHost: this.questHost,
      completed: completed.length,
      total: this.participants.length,
      allComplete: completed.length === this.participants.length,
      responses: completed,
      pendingPlayers: pending.map((p) => p.userId),
    };
  }

  getCharacterSheet(userId: string): unknown {
    const player = this.players[userId];
    return player ? player.getCharacterSheet() : null;
  }

  resetPlayerTraits(): void {
    Object.values(this.players).forEach((player) => player.resetTraitUsage());
  }

  checkSceneTransition(): { shouldTransition: boolean; result?: string } {
    if (this.sceneSuccesses >= 3) return { shouldTransition: true, result: 'success' };
    if (this.sceneFailures >= 3) return { shouldTransition: true, result: 'failure' };
    return { shouldTransition: false };
  }

  getStatus(): unknown {
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
      created: this.created,
    };
  }

  getCharacterCreationProgress(): unknown {
    const completed = this.participants.filter((userId) => {
      const player = this.players[userId];
      return player && player.isCharacterComplete();
    });
    return {
      completed: completed.length,
      total: this.participants.length,
      ready: completed.length === this.participants.length,
      completedPlayers: completed,
    };
  }

  toJSON(): AdventureData {
    const playersData: Record<string, unknown> = {};
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
      lastActivityAt: this.lastActivityAt,
      locked: this.locked,
      questDefined: this.questDefined,
      questHost: this.questHost,
      startedBy: this.startedBy ?? null,
      openingScene: this.openingScene,
      sceneTruths: this.sceneTruths,
      currentSceneTruths: this.currentSceneTruths,
      epilogueResponses: this.epilogueResponses as Record<string, unknown>,
      epiloguePhase: this.epiloguePhase,
      finaleContent: this.finaleContent,
      consecutivePartials: this.consecutivePartials,
      players: playersData,
      adventureTraitUsage: this.adventureTraitUsage,
      narrative: this.narrative,
    };
  }

  static fromJSON(data: AdventureData): Adventure {
    const adventure = Object.create(Adventure.prototype) as Adventure;

    Object.assign(adventure, {
      id: data.id,
      threadId: data.threadId,
      jobId: data.jobId,
      participants: data.participants,
      phase: data.phase,
      currentPhase: data.currentPhase,
      scene: data.scene,
      sceneState: data.sceneState ?? SCENE_STATES.SETUP,
      sceneSuccesses: data.sceneSuccesses ?? 0,
      sceneFailures: data.sceneFailures ?? 0,
      consecutivePartials: data.consecutivePartials ?? 0,
      failedScenes: data.failedScenes ?? 0,
      created: new Date(data.created),
      locked: data.locked,
      questDefined: data.questDefined,
      questHost: data.questHost ?? null,
      openingScene: data.openingScene ?? null,
      sceneTruths: data.sceneTruths ?? {},
      currentSceneTruths: data.currentSceneTruths ?? {},
      epilogueResponses: data.epilogueResponses ?? {},
      epiloguePhase: data.epiloguePhase ?? false,
      finaleContent: data.finaleContent ?? null,
      lastActivityAt: data.lastActivityAt ? new Date(data.lastActivityAt) : new Date(),
      startedBy: data.startedBy ?? null,
      adventureTraitUsage: data.adventureTraitUsage ?? {},
      narrative: data.narrative ?? {
        lastPlayer: null,
        pendingResolution: null,
        turnHistory: [],
        waitingForFirstTurn: true,
        pendingTransition: null,
        turnLock: null,
        transitionLock: null,
      },
    });

    adventure.players = {};
    if (data.players) {
      Object.entries(data.players as Record<string, unknown>).forEach(([userId, playerData]) => {
        adventure.players[userId] = Player.fromJSON(playerData as import('../types/index.js').PlayerData);
      });
    } else {
      adventure.participants.forEach((userId) => {
        adventure.players[userId] = new Player(userId);
      });
    }

    return adventure;
  }
}
