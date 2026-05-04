import { generateHookId } from '../utils/gameHelpers.js';
import { GAME_CONSTANTS } from '../config/constants.js';

/**
 * Hook class to manage story hook postings
 */
export class Hook {
  constructor(description, postedBy, channelId, guildId) {
    this.id = generateHookId();
    this.description = description;
    this.postedBy = postedBy;
    this.channelId = channelId;
    this.guildId = guildId || null;
    this.participants = [];
    this.created = new Date();
    this.status = 'open'; // open, in-progress, completed
  }

  /**
   * Add a participant to the job
   * @param {string} userId - User ID to add
   * @returns {Object} - Result of adding participant
   */
  addParticipant(userId) {
    // Check if user is already a participant
    if (this.participants.includes(userId)) {
      return {
        success: false,
        error: 'User is already a participant'
      };
    }

    // Check if hook is still open
    if (this.status !== 'open') {
      return {
        success: false,
        error: 'This story hook is no longer accepting participants'
      };
    }

    // Check max participants
    if (this.participants.length >= GAME_CONSTANTS.MAX_PLAYERS - 1) { // -1 because poster takes one slot
      return {
        success: false,
        error: 'This story is full'
      };
    }

    this.participants.push(userId);

    return {
      success: true,
      totalParticipants: this.participants.length
    };
  }

  /**
   * Remove a participant from the job
   * @param {string} userId - User ID to remove
   * @returns {Object} - Result of removing participant
   */
  removeParticipant(userId) {
    const index = this.participants.indexOf(userId);
    
    if (index === -1) {
      return {
        success: false,
        error: 'User is not a participant'
      };
    }

    this.participants.splice(index, 1);

    return {
      success: true,
      totalParticipants: this.getTotalParticipants()
    };
  }

  /**
   * Get all participant IDs (does not include job poster unless they joined)
   * @returns {Array} - Array of participant IDs
   */
  getAllParticipants() {
    return [...this.participants];
  }

  /**
   * Get total count including poster (for display purposes)
   * @returns {number} - Total participant count including poster
   */
  getTotalParticipants() {
    return this.participants.length + 1; // +1 for poster
  }

  /**
   * Check if user is involved in this job (only actual participants)
   * @param {string} userId - User ID to check
   * @returns {boolean} - Whether user is involved
   */
  isUserInvolved(userId) {
    return this.participants.includes(userId);
  }

  /**
   * Check if user can join this job
   * @param {string} userId - User ID to check
   * @returns {boolean} - Whether user can join
   */
  canUserJoin(userId) {
    if (userId === this.postedBy) {
      return !this.participants.includes(userId); // Poster can join if not already a participant
    }
    return this.status === 'open' && !this.participants.includes(userId);
  }

  /**
   * Check if job is ready to start
   * @returns {Object} - Ready status
   */
  isReadyToStart() {
    const totalParticipants = this.participants.length; // Don't auto-include poster
    
    return {
      ready: totalParticipants >= GAME_CONSTANTS.MIN_PLAYERS,
      totalParticipants,
      needed: Math.max(0, GAME_CONSTANTS.MIN_PLAYERS - totalParticipants)
    };
  }

  /**
   * Mark job as in progress (adventure started)
   */
  markInProgress() {
    this.status = 'in-progress';
  }

  /**
   * Mark job as completed
   */
  markCompleted() {
    this.status = 'completed';
  }

  /**
   * Check if job can accept more participants
   * @returns {boolean} - Whether job accepts participants
   */
  canAcceptParticipants() {
    return this.status === 'open';
  }

  /**
   * Get job summary for display
   * @returns {Object} - Job display data
   */
  getSummary() {
    const readyStatus = this.isReadyToStart();
    
    return {
      id: this.id,
      description: this.description,
      postedBy: this.postedBy,
      participants: [...this.participants],
      totalParticipants: this.getTotalParticipants(),
      status: this.status,
      created: this.created,
      ready: readyStatus.ready,
      needed: readyStatus.needed
    };
  }

  /**
   * Generate display text for the job
   * @returns {string} - Formatted job display
   */
  getDisplayText() {
    const readyStatus = this.isReadyToStart();
    const statusEmoji = readyStatus.ready ? '✅' : '⏳';
    const statusText = readyStatus.ready 
      ? 'Ready to start!'
      : `Need ${readyStatus.needed} more player${readyStatus.needed > 1 ? 's' : ''}`;

    return `${statusEmoji} **${this.description}**\n` +
           `Posted by: <@${this.postedBy}>\n` +
           `Players: ${this.getTotalParticipants()}/∞\n` +
           `Status: ${statusText}`;
  }

  /**
   * Serialize job for storage
   * @returns {Object} - Serializable object
   */
  toJSON() {
    return {
      id: this.id,
      description: this.description,
      postedBy: this.postedBy,
      channelId: this.channelId,
      guildId: this.guildId || null,
      participants: this.participants,
      created: this.created,
      status: this.status
    };
  }

  /**
   * Create Hook from serialized data
   * @param {Object} data - Serialized hook data
   * @returns {Hook} - Hook instance
   */
  static fromJSON(data) {
    const hook = Object.create(Hook.prototype);
    return Object.assign(hook, data, {
      created: new Date(data.created)
    });
  }
}