import { generateJobId } from '../utils/gameHelpers.js';
import { GAME_CONSTANTS } from '../config/constants.js';

/**
 * Job class to manage adventure job postings
 */
export class Job {
  constructor(description, postedBy, channelId) {
    this.id = generateJobId();
    this.description = description;
    this.postedBy = postedBy;
    this.channelId = channelId;
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

    // Check if user is the job poster
    if (userId === this.postedBy) {
      return {
        success: false,
        error: 'Job poster is automatically included'
      };
    }

    // Check if job is still open
    if (this.status !== 'open') {
      return {
        success: false,
        error: 'Job is no longer accepting participants'
      };
    }

    this.participants.push(userId);

    return {
      success: true,
      totalParticipants: this.getTotalParticipants()
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
   * Get total number of participants including job poster
   * @returns {number} - Total participant count
   */
  getTotalParticipants() {
    return this.participants.length + 1; // +1 for job poster
  }

  /**
   * Get all participant IDs including job poster
   * @returns {Array} - Array of all participant IDs
   */
  getAllParticipants() {
    return [this.postedBy, ...this.participants];
  }

  /**
   * Check if user is involved in this job (poster or participant)
   * @param {string} userId - User ID to check
   * @returns {boolean} - Whether user is involved
   */
  isUserInvolved(userId) {
    return userId === this.postedBy || this.participants.includes(userId);
  }

  /**
   * Check if job is ready to start
   * @returns {Object} - Ready status
   */
  isReadyToStart() {
    const totalParticipants = this.getTotalParticipants();
    
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
      participants: this.participants,
      created: this.created,
      status: this.status
    };
  }

  /**
   * Create Job from serialized data
   * @param {Object} data - Serialized job data
   * @returns {Job} - Job instance
   */
  static fromJSON(data) {
    const job = Object.create(Job.prototype);
    return Object.assign(job, data, {
      created: new Date(data.created)
    });
  }
}