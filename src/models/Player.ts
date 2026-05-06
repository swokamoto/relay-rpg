import type {
  TraitType,
  CharacterTrait,
  CharacterTraits,
  PlayerStats,
  PlayerData,
  ActionResult,
  TraitUsageResult,
  AvailableTrait,
} from '../types/index.js';

export class Player {
  userId: string;
  characterName: string | null;
  characterTraits: CharacterTraits;
  stats: PlayerStats;
  created: Date;

  constructor(userId: string) {
    this.userId = userId;
    this.characterName = null;
    this.characterTraits = {
      conviction: { description: null, used: false },
      talent:     { description: null, used: false },
      quirk:      { description: null, used: false },
    };
    this.stats = {
      traitsUsed: 0,
      scenesParticipated: 0,
      successfulActions: 0,
    };
    this.created = new Date();
  }

  setCharacterName(name: string): void {
    this.characterName = name.trim();
  }

  getCharacterName(): string {
    return this.characterName ?? 'Unnamed Character';
  }

  setConviction(description: string): void {
    this.characterTraits.conviction = {
      description: description.trim(),
      used: false,
      timestamp: new Date(),
    };
  }

  setTalent(description: string): void {
    this.characterTraits.talent = {
      description: description.trim(),
      used: false,
      timestamp: new Date(),
    };
  }

  setQuirk(description: string): void {
    this.characterTraits.quirk = {
      description: description.trim(),
      used: false,
      timestamp: new Date(),
    };
  }

  setTrait(traitType: TraitType, description: string): void {
    this.characterTraits[traitType] = {
      description: description.trim(),
      used: false,
      timestamp: new Date(),
    };
  }

  useTrait(traitType: string): ActionResult<{ trait: TraitUsageResult }> {
    if (!['conviction', 'talent', 'quirk'].includes(traitType)) {
      return { success: false, error: 'Invalid trait type. Use conviction, talent, or quirk.' };
    }

    const key = traitType as TraitType;
    const trait = this.characterTraits[key];

    if (!trait?.description) {
      return { success: false, error: `No ${traitType} defined for this character` };
    }

    if (trait.used) {
      return {
        success: false,
        error: `${traitType.charAt(0).toUpperCase() + traitType.slice(1)} already used this adventure`,
      };
    }

    trait.used = true;
    trait.usedTimestamp = new Date();
    this.stats.traitsUsed++;

    return {
      success: true,
      trait: { type: key, description: trait.description },
    };
  }

  getAvailableTraits(): AvailableTrait[] {
    return (Object.entries(this.characterTraits) as [TraitType, CharacterTrait][])
      .filter(([, trait]) => trait.description !== null && !trait.used)
      .map(([type, trait]) => ({ type, description: trait.description as string }));
  }

  getUsedTraits(): Array<{ type: TraitType; description: string; usedTimestamp?: Date }> {
    return (Object.entries(this.characterTraits) as [TraitType, CharacterTrait][])
      .filter(([, trait]) => trait.description !== null && trait.used)
      .map(([type, trait]) => ({
        type,
        description: trait.description as string,
        usedTimestamp: trait.usedTimestamp,
      }));
  }

  isCharacterComplete(): boolean {
    if (!this.characterName || this.characterName.trim().length === 0) return false;
    return Object.values(this.characterTraits).every(
      (trait) => trait.description && trait.description.trim().length > 0,
    );
  }

  resetTraitUsage(): void {
    for (const trait of Object.values(this.characterTraits)) {
      if (trait.description) {
        trait.used = false;
        delete trait.usedTimestamp;
      }
    }
    this.stats.traitsUsed = 0;
  }

  getCharacterSheet() {
    return {
      conviction: this.characterTraits.conviction.description,
      talent:     this.characterTraits.talent.description,
      quirk:      this.characterTraits.quirk.description,
      traits: {
        conviction: this.characterTraits.conviction,
        talent:     this.characterTraits.talent,
        quirk:      this.characterTraits.quirk,
      },
      stats: {
        ...this.stats,
        characterComplete: this.isCharacterComplete(),
        availableTraits: this.getAvailableTraits().length,
        usedTraits: this.getUsedTraits().length,
      },
      created: this.created,
    };
  }

  toJSON(): PlayerData {
    return {
      userId: this.userId,
      characterName: this.characterName,
      characterTraits: this.characterTraits,
      stats: this.stats,
      created: this.created,
    };
  }

  static fromJSON(data: PlayerData): Player {
    const player = new Player(data.userId);
    player.characterName = data.characterName ?? null;
    player.characterTraits = data.characterTraits ?? player.characterTraits;
    player.stats = { ...player.stats, ...data.stats };
    player.created = new Date(data.created);
    return player;
  }

  recordSuccessfulAction(): void {
    this.stats.successfulActions++;
  }

  recordSceneParticipation(): void {
    this.stats.scenesParticipated++;
  }
}
