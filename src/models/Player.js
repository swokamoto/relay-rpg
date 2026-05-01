/**
 * Player class to manage global character data and progression
 */
export class Player {
  constructor(userId) {
    this.userId = userId;
    this.characterName = null; // Character name
    this.characterTraits = {
      conviction: {
        description: null,
        used: false
      },
      talent: {
        description: null,
        used: false
      },
      quirk: {
        description: null,
        used: false
      }
    };
    this.stats = {
      traitsUsed: 0,
      scenesParticipated: 0,
      successfulActions: 0
    };
    this.created = new Date();
  }

  /**
   * Set character name
   * @param {string} name - Character name
   */
  setCharacterName(name) {
    this.characterName = name.trim();
  }

  /**
   * Get character name or fallback
   * @returns {string} - Character name or 'Unnamed Character'
   */
  getCharacterName() {
    return this.characterName || 'Unnamed Character';
  }

  /**
   * Set character conviction
   * @param {string} description - Conviction description
   */
  setConviction(description) {
    this.characterTraits.conviction = {
      description: description.trim(),
      used: false,
      timestamp: new Date()
    };
  }

  /**
   * Set character talent
   * @param {string} description - Talent description
   */
  setTalent(description) {
    this.characterTraits.talent = {
      description: description.trim(),
      used: false,
      timestamp: new Date()
    };
  }

  /**
   * Set character quirk
   * @param {string} description - Quirk description
   */
  setQuirk(description) {
    this.characterTraits.quirk = {
      description: description.trim(),
      used: false,
      timestamp: new Date()
    };
  }

  /**
   * Use a character trait (mark as used)
   * @param {string} traitType - 'conviction', 'talent', or 'quirk'
   * @returns {Object} - Result of using trait
   */
  useTrait(traitType) {
    if (!['conviction', 'talent', 'quirk'].includes(traitType)) {
      return {
        success: false,
        error: 'Invalid trait type. Use conviction, talent, or quirk.'
      };
    }

    const trait = this.characterTraits[traitType];

    if (!trait || !trait.description) {
      return {
        success: false,
        error: `No ${traitType} defined for this character`
      };
    }

    if (trait.used) {
      return {
        success: false,
        error: `${traitType.charAt(0).toUpperCase() + traitType.slice(1)} already used this adventure`
      };
    }

    trait.used = true;
    trait.usedTimestamp = new Date();
    this.stats.traitsUsed++;

    return {
      success: true,
      trait: {
        type: traitType,
        description: trait.description
      }
    };
  }

  /**
   * Get available (unused) traits
   * @returns {Array} - Array of unused traits
   */
  getAvailableTraits() {
    const available = [];
    
    Object.entries(this.characterTraits).forEach(([type, trait]) => {
      if (trait.description && !trait.used) {
        available.push({
          type,
          description: trait.description
        });
      }
    });
    
    return available;
  }

  /**
   * Get used traits
   * @returns {Array} - Array of used traits
   */
  getUsedTraits() {
    const used = [];
    
    Object.entries(this.characterTraits).forEach(([type, trait]) => {
      if (trait.description && trait.used) {
        used.push({
          type,
          description: trait.description,
          usedTimestamp: trait.usedTimestamp
        });
      }
    });
    
    return used;
  }

  /**
   * Check if character creation is complete (name + all traits)
   * @returns {boolean} - Whether character creation is complete
   */
  isCharacterComplete() {
    // Check if character has a name
    if (!this.characterName || this.characterName.trim().length === 0) {
      return false;
    }
    
    // Check if all traits are defined
    return Object.values(this.characterTraits).every(trait => 
      trait.description && trait.description.trim().length > 0
    );
  }

  /**
   * Reset trait usage for new adventure
   */
  resetTraitUsage() {
    Object.values(this.characterTraits).forEach(trait => {
      if (trait.description) {
        trait.used = false;
        if (trait.usedTimestamp) {
          delete trait.usedTimestamp;
        }
      }
    });
    this.stats.traitsUsed = 0;
  }

  /**
   * Get character sheet data for display
   * @returns {Object} - Character sheet information
   */
  getCharacterSheet() {
    return {
      // Convenient flat access to descriptions
      conviction: this.characterTraits.conviction.description,
      talent: this.characterTraits.talent.description,
      quirk: this.characterTraits.quirk.description,
      
      // Full trait objects for detailed access
      traits: {
        conviction: this.characterTraits.conviction,
        talent: this.characterTraits.talent, 
        quirk: this.characterTraits.quirk
      },
      
      stats: {
        ...this.stats,
        characterComplete: this.isCharacterComplete(),
        availableTraits: this.getAvailableTraits().length,
        usedTraits: this.getUsedTraits().length
      },
      created: this.created
    };
  }

  /**
   * Export player data for storage
   * @returns {Object} - Serializable player data
   */
  toJSON() {
    return {
      userId: this.userId,
      adventureId: this.adventureId,
      characterName: this.characterName,
      characterTraits: this.characterTraits,
      stats: this.stats,
      created: this.created
    };
  }

  /**
   * Create player from saved data
   * @param {Object} data - Saved player data
   * @returns {Player} - Restored player instance
   */
  static fromJSON(data) {
    const player = new Player(data.userId, data.adventureId);
    player.characterName = data.characterName || null;
    player.characterTraits = data.characterTraits || player.characterTraits;
    player.stats = { ...player.stats, ...data.stats };
    player.created = new Date(data.created);
    return player;
  }

  /**
   * Set character trait (generic method)
   * @param {string} traitType - Type of trait ('conviction', 'talent', 'quirk')
   * @param {string} description - Trait description 
   */
  setTrait(traitType, description) {
    if (!['conviction', 'talent', 'quirk'].includes(traitType)) {
      throw new Error('Invalid trait type. Use conviction, talent, or quirk.');
    }

    this.characterTraits[traitType] = {
      description: description.trim(),
      used: false,
      timestamp: new Date()
    };
  }

  /**
   * Record successful action (for statistics)
   */
  recordSuccessfulAction() {
    this.stats.successfulActions++;
  }

  /**
   * Record scene participation (for statistics)
   */
  recordSceneParticipation() {
    this.stats.scenesParticipated++;
  }
}