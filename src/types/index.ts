// ─── Discord Command Payload Types ──────────────────────────────────────────

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export interface DiscordMember {
  user: DiscordUser;
  roles: string[];
}

export interface DiscordInteractionOption {
  name: string;
  type: number;
  value: string | number | boolean;
}

export interface DiscordInteractionData {
  id: string;
  name: string;
  type: number;
  options?: DiscordInteractionOption[];
  custom_id?: string;
  component_type?: number;
  values?: string[];
}

/** Shape of req.body for every Discord slash command / component interaction */
export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data: DiscordInteractionData;
  guild_id?: string;
  channel_id: string;
  member?: DiscordMember;
  user?: DiscordUser;
  token: string;
  /** 0 = guild, 1 = bot DM, 2 = private channel */
  context?: number;
}

// ─── Game Enum Value Types ───────────────────────────────────────────────────

export type AdventurePhase = 'waiting' | 'playing' | 'completed';
export type TraitType = 'conviction' | 'talent' | 'quirk';
export type EpilogueType = 'growth' | 'thread' | 'hook';

// ─── Result Types ────────────────────────────────────────────────────────────

export type ActionSuccess<T = Record<string, unknown>> = { success: true } & T;
export type ActionFailure = { success: false; error: string };
export type ActionResult<T = Record<string, unknown>> = ActionSuccess<T> | ActionFailure;

// ─── Player Types ────────────────────────────────────────────────────────────

export interface CharacterTrait {
  description: string | null;
  timestamp?: Date;
}

export interface CharacterTraits {
  conviction: CharacterTrait;
  talent: CharacterTrait;
  quirk: CharacterTrait;
}

export interface PlayerData {
  userId: string;
  adventureId?: string;
  characterName: string | null;
  characterTraits: CharacterTraits;
  created: Date | string;
}

// ─── Adventure Types ─────────────────────────────────────────────────────────

export interface TraitUsageMap {
  conviction: boolean;
  talent: boolean;
  quirk: boolean;
}

export interface TurnLock {
  playerId: string;
  timestamp: Date;
}

export interface TruthEntry {
  description: string;
  timestamp: Date;
}

export interface TurnHistoryEntry {
  playerId: string;
  narrative: string;
  roll?: number;
  timestamp: Date;
}

export interface NarrativeState {
  lastPlayer: string | null;
  pendingResolution: unknown | null;
  turnHistory: TurnHistoryEntry[];
  waitingForFirstTurn: boolean;
  pendingTransition: unknown | null;
  turnLock: TurnLock | null;
  transitionLock: TurnLock | null;
}

/** Minimal storage interface used by Adventure methods to avoid circular imports */
export interface IGameStorage {
  getPlayer(userId: string): import('../models/Player.js').Player | null;
  hasCompleteCharacter(userId: string): boolean;
}

export interface AdventureData {
  id: string;
  threadId: string;
  jobId: string;
  participants: string[];
  phase: AdventurePhase;
  scene: number;
  sceneSuccesses: number;
  sceneFailures: number;
  consecutivePartials: number;
  failedScenes: number;
  created: Date | string;
  lastActivityAt: Date | string;
  locked: boolean;
  questHost: string | null;
  startedBy: string | null;
  openingScene: string | null;
  sceneTruths: Record<number, Record<string, TruthEntry>>;
  currentSceneTruths: Record<string, TruthEntry>;
  epilogueResponses: Record<string, unknown>;
  epiloguePhase: boolean;
  finaleContent: string | null;
  adventureTraitUsage: Record<string, TraitUsageMap>;
  narrative: NarrativeState;
}
