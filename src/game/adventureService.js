import { Adventure } from '../models/Adventure.js';
import { Job } from '../models/Job.js';
import { gameStorage } from '../storage/gameState.js';
import { 
  validateAdventureDescription,
  validateParticipantCount 
} from '../utils/validation.js';
import { GAME_CONSTANTS } from '../config/constants.js';

/**
 * Adventure management service
 * Handles business logic for adventures and character creation
 */
export class AdventureService {
  
  /**
   * Create a new adventure from a job
   * @param {string} jobId - Job ID to create adventure from
   * @param {string} threadId - Thread ID for the adventure
   * @returns {Object} - Result with adventure or error
   */
  static createAdventure(jobId, threadId) {
    const job = gameStorage.findJob(jobId);
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    const allParticipants = job.getAllParticipants();
    const validation = validateParticipantCount(allParticipants);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check if adventure already exists
    const existingAdventure = gameStorage.findAdventure(`adventure_${jobId}`);
    if (existingAdventure) {
      return { success: false, error: 'Adventure already exists for this job' };
    }

    const adventure = new Adventure(jobId, threadId, allParticipants);
    gameStorage.addAdventure(adventure);
    
    // Mark job as in progress
    job.markInProgress();

    return { success: true, adventure };
  }

  /**
   * Begin an adventure (start character creation)
   * @param {string} adventureId - Adventure ID
   * @param {string} userId - User requesting to begin
   * @returns {Object} - Result with turn info or error
   */
  static beginAdventure(adventureId, userId) {
    const adventure = gameStorage.findAdventure(adventureId);
    if (!adventure) {
      return { success: false, error: 'Adventure not found' };
    }

    if (!adventure.isParticipant(userId)) {
      return { success: false, error: 'User is not a participant' };
    }

    const canStart = adventure.canStart();
    if (!canStart.can) {
      return { success: false, error: canStart.reason };
    }

    const turnInfo = adventure.begin();
    return { success: true, turnInfo };
  }

  /**
   * Give a gift in an adventure
   * @param {string} threadId - Thread ID
   * @param {string} userId - User giving the gift
   * @param {string} description - Gift description
   * @returns {Object} - Result with gift info or error
   */
  static giveGift(threadId, userId, description) {
    const adventure = gameStorage.findAdventureByThread(threadId);
    if (!adventure) {
      return { success: false, error: 'Adventure not found' };
    }

    return adventure.giveGift(userId, description);
  }

  /**
   * Give a heroic quality in an adventure
   * @param {string} threadId - Thread ID
   * @param {string} userId - User giving the quality
   * @param {string} quality - Heroic quality
   * @returns {Object} - Result with heroic info or error
   */
  static giveHeroicQuality(threadId, userId, quality) {
    const adventure = gameStorage.findAdventureByThread(threadId);
    if (!adventure) {
      return { success: false, error: 'Adventure not found' };
    }

    return adventure.giveHeroicQuality(userId, quality);
  }

  /**
   * Get adventure status
   * @param {string} threadId - Thread ID
   * @returns {Object|null} - Adventure status or null if not found
   */
  static getAdventureStatus(threadId) {
    const adventure = gameStorage.findAdventureByThread(threadId);
    return adventure ? adventure.getStatus() : null;
  }

  /**
   * Get character sheet for a player
   * @param {string} threadId - Thread ID
   * @param {string} userId - Player user ID
   * @returns {Object|null} - Character sheet or null if not found
   */
  static getCharacterSheet(threadId, userId) {
    const adventure = gameStorage.findAdventureByThread(threadId);
    return adventure ? adventure.getCharacterSheet(userId) : null;
  }

  /**
   * Complete an adventure
   * @param {string} adventureId - Adventure ID
   * @returns {Object} - Result of completion
   */
  static completeAdventure(adventureId) {
    const adventure = gameStorage.findAdventure(adventureId);
    if (!adventure) {
      return { success: false, error: 'Adventure not found' };
    }

    // Mark associated job as completed
    const job = gameStorage.findJob(adventure.jobId);
    if (job) {
      job.markCompleted();
    }

    // Remove adventure from active games
    gameStorage.removeAdventure(adventureId);

    return { success: true };
  }

  /**
   * Get all active adventures
   * @returns {Array} - Array of adventures
   */
  static getActiveAdventures() {
    return Object.values(gameStorage.getActiveAdventures());
  }

  /**
   * Clean up old or completed adventures
   * @returns {number} - Number of adventures cleaned up
   */
  static cleanupAdventures() {
    const adventures = Object.values(gameStorage.getActiveAdventures());
    let cleanedUp = 0;

    adventures.forEach(adventure => {
      const age = Date.now() - new Date(adventure.created).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      // Clean up old adventures or completed ones
      if (age > maxAge || adventure.phase === 'completed') {
        gameStorage.removeAdventure(adventure.id);
        cleanedUp++;
      }
    });

    return cleanedUp;
  }
}