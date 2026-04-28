import { Job } from '../models/Job.js';
import { gameStorage } from '../storage/gameState.js';
import { validateAdventureDescription } from '../utils/validation.js';
import { 
  createThread, 
  addUserToThread 
} from '../utils/discord.js';
import { 
  truncateForThreadName,
  getPlayerStatusMessage 
} from '../utils/gameHelpers.js';
import { config } from '../config/config.js';
import { EMOJIS } from '../config/constants.js';

/**
 * Job board management service
 * Handles business logic for job postings, recruitment, and thread management
 */
export class JobBoardService {
  
  /**
   * Create a new job posting
   * @param {string} description - Job description
   * @param {string} postedBy - User ID of job poster
   * @param {string} channelId - Channel ID where job was posted
   * @returns {Object} - Result with job or error
   */
  static createJob(description, postedBy, channelId) {
    const validation = validateAdventureDescription(description);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const job = new Job(validation.description, postedBy, channelId);
    gameStorage.addJob(job);

    return { success: true, job };
  }

  /**
   * Add a participant to a job
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID to add
   * @param {string} channelId - Channel ID for thread creation
   * @returns {Object} - Result with thread info or error
   */
  static async joinJob(jobId, userId, channelId) {
    const job = gameStorage.findJob(jobId);
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    // Add user to job
    const addResult = job.addParticipant(userId);
    if (!addResult.success) {
      return { success: false, error: addResult.error };
    }

    try {
      // Handle thread creation/management
      const threadResult = await this.manageJobThread(job, userId, channelId);
      if (!threadResult.success) {
        // Rollback job participation if thread management failed
        job.removeParticipant(userId);
        return threadResult;
      }

      return {
        success: true,
        job,
        threadInfo: threadResult.threadInfo,
        totalParticipants: job.getTotalParticipants(),
        readyToStart: job.isReadyToStart()
      };
    } catch (error) {
      // Rollback job participation if any error occurred
      job.removeParticipant(userId);
      throw error;
    }
  }

  /**
   * Manage thread creation and user addition for a job
   * @param {Job} job - Job instance
   * @param {string} newUserId - New user to add to thread
   * @param {string} channelId - Channel ID for thread creation
   * @returns {Object} - Result with thread info
   */
  static async manageJobThread(job, newUserId, channelId) {
    let threadInfo = gameStorage.findThread(job.id);

    if (!threadInfo) {
      // Create new Discord thread
      const threadName = `${EMOJIS.SWORD} ${truncateForThreadName(job.description)}`;
      
      try {
        const threadData = await createThread(
          channelId, 
          threadName, 
          config.game.threadAutoArchiveDuration
        );
        
        // Store thread info
        threadInfo = {
          jobId: job.id,
          threadId: threadData.id,
          participants: [job.postedBy, newUserId],
          created: new Date()
        };
        gameStorage.addThread(job.id, threadInfo);
        
        // Add both users to thread
        await addUserToThread(threadData.id, job.postedBy);
        await addUserToThread(threadData.id, newUserId);
        
      } catch (error) {
        return { 
          success: false, 
          error: 'Failed to create adventure thread' 
        };
      }
    } else {
      // Add new user to existing thread
      try {
        threadInfo.participants.push(newUserId);
        await addUserToThread(threadInfo.threadId, newUserId);
      } catch (error) {
        return { 
          success: false, 
          error: 'Failed to add user to thread' 
        };
      }
    }

    return { success: true, threadInfo };
  }

  /**
   * Get available jobs for display
   * @param {number} limit - Maximum number of jobs to return
   * @returns {Array} - Array of available jobs
   */
  static getAvailableJobs(limit = 5) {
    return gameStorage.getOpenJobs()
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, limit);
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Job|null} - Job instance or null if not found
   */
  static getJob(jobId) {
    return gameStorage.findJob(jobId);
  }

  /**
   * Remove a participant from a job
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID to remove
   * @returns {Object} - Result of removal
   */
  static leaveJob(jobId, userId) {
    const job = gameStorage.findJob(jobId);
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    const result = job.removeParticipant(userId);
    if (!result.success) {
      return result;
    }

    // Update thread participant list
    const threadInfo = gameStorage.findThread(jobId);
    if (threadInfo) {
      const index = threadInfo.participants.indexOf(userId);
      if (index !== -1) {
        threadInfo.participants.splice(index, 1);
      }
    }

    return { success: true, totalParticipants: job.getTotalParticipants() };
  }

  /**
   * Close a job (mark as no longer accepting participants)
   * @param {string} jobId - Job ID
   * @param {string} userId - User requesting closure (must be poster)
   * @returns {Object} - Result of closure
   */
  static closeJob(jobId, userId) {
    const job = gameStorage.findJob(jobId);
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.postedBy !== userId) {
      return { success: false, error: 'Only the job poster can close this job' };
    }

    job.status = 'closed';
    return { success: true };
  }

  /**
   * Get jobs posted by a specific user
   * @param {string} userId - User ID
   * @returns {Array} - Array of jobs posted by user
   */
  static getUserJobs(userId) {
    return gameStorage.getJobBoard().filter(job => job.postedBy === userId);
  }

  /**
   * Get jobs where user is a participant
   * @param {string} userId - User ID
   * @returns {Array} - Array of jobs where user participates
   */
  static getUserParticipations(userId) {
    return gameStorage.getJobBoard().filter(job => 
      job.participants.includes(userId)
    );
  }

  /**
   * Clean up old or completed jobs
   * @returns {number} - Number of jobs cleaned up
   */
  static cleanupJobs() {
    const cleaned = gameStorage.cleanupCompletedJobs();
    gameStorage.cleanupOldThreads();
    return cleaned;
  }

  /**
   * Get job board statistics
   * @returns {Object} - Statistics about the job board
   */
  static getJobBoardStats() {
    const jobs = gameStorage.getJobBoard();
    return {
      total: jobs.length,
      open: jobs.filter(job => job.status === 'open').length,
      inProgress: jobs.filter(job => job.status === 'in-progress').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      ready: jobs.filter(job => job.isReadyToStart().ready).length
    };
  }
}