import type {
  TraitType,
  CharacterTraits,
  PlayerData,
} from '../types/index.js';

export class Player {
  userId: string;
  characterName: string | null;
  characterTraits: CharacterTraits;
  created: Date;

  constructor(userId: string) {
    this.userId = userId;
    this.characterName = null;
    this.characterTraits = {
      conviction: { description: null },
      talent:     { description: null },
      quirk:      { description: null },
    };
    this.created = new Date();
  }

  setCharacterName(name: string): void {
    this.characterName = name.trim();
  }

  getCharacterName(): string {
    return this.characterName ?? 'Unnamed Character';
  }

  setTrait(traitType: TraitType, description: string): void {
    this.characterTraits[traitType] = {
      description: description.trim(),
      timestamp: new Date(),
    };
  }

  isCharacterComplete(): boolean {
    if (!this.characterName || this.characterName.trim().length === 0) return false;
    return Object.values(this.characterTraits).every(
      (trait) => trait.description && trait.description.trim().length > 0,
    );
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
      created: this.created,
    };
  }

  toJSON(): PlayerData {
    return {
      userId: this.userId,
      characterName: this.characterName,
      characterTraits: this.characterTraits,
      created: this.created,
    };
  }

  static fromJSON(data: PlayerData): Player {
    const player = new Player(data.userId);
    player.characterName = data.characterName ?? null;
    player.characterTraits = data.characterTraits ?? player.characterTraits;
    player.created = new Date(data.created);
    return player;
  }

}

