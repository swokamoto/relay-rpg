import { Adventure } from '../models/Adventure.js';
import { Job } from '../models/Job.js';
import { Player } from '../models/Player.js';

/**
 * In-memory storage for game state
 * In a production environment, this would be replaced with a proper database
 */
class GameStorage {
  constructor() {
    this.jobBoard = [];
    this.activeGames = {};
    this.activeThreads = {};
    this.globalCharacters = {}; // userId -> Player object
  }

  // Job Board Methods
  addJob(job) {
    this.jobBoard.push(job);
    return job;
  }

  findJob(jobId) {
    return this.jobBoard.find(job => job.id === jobId);
  }

  updateJob(job) {
    const index = this.jobBoard.findIndex(j => j.id === job.id);
    if (index !== -1) {
      this.jobBoard[index] = job;
      return job;
    }
    return null;
  }

  removeJob(jobId) {
    const index = this.jobBoard.findIndex(job => job.id === jobId);
    if (index !== -1) {
      return this.jobBoard.splice(index, 1)[0];
    }
    return null;
  }

  getJobBoard() {
    return [...this.jobBoard];
  }

  getOpenJobs() {
    return this.jobBoard.filter(job => job.canAcceptParticipants());
  }

  // Check if user is participating in any open job
  isUserInAnyJob(userId) {
    return this.jobBoard.some(job => 
      job.status === 'open' && job.isUserInvolved(userId)
    );
  }

  // Get the job a user is currently involved in (if any)
  getUserActiveJob(userId) {
    return this.jobBoard.find(job => 
      job.status === 'open' && job.isUserInvolved(userId)
    );
  }

  // Adventure Methods
  addAdventure(adventure) {
    this.activeGames[adventure.id] = adventure;
    return adventure;
  }

  findAdventure(adventureId) {
    return this.activeGames[adventureId];
  }

  findAdventureByThread(threadId) {
    return Object.values(this.activeGames).find(adventure => 
      adventure.threadId === threadId
    );
  }

  findAdventureByJobId(jobId) {
    return Object.values(this.activeGames).find(adventure => 
      adventure.jobId === jobId
    );
  }

  removeAdventure(adventureId) {
    const adventure = this.activeGames[adventureId];
    if (adventure) {
      delete this.activeGames[adventureId];
      return adventure;
    }
    return null;
  }

  getActiveAdventures() {
    return { ...this.activeGames };
  }

  // Thread Methods
  addThread(jobId, threadInfo) {
    this.activeThreads[jobId] = threadInfo;
    return threadInfo;
  }

  findThread(jobId) {
    return this.activeThreads[jobId];
  }

  findThreadByThreadId(threadId) {
    return Object.values(this.activeThreads).find(thread => 
      thread.threadId === threadId
    );
  }

  removeThread(jobId) {
    const thread = this.activeThreads[jobId];
    if (thread) {
      delete this.activeThreads[jobId];
      return thread;
    }
    return null;
  }

  getActiveThreads() {
    return { ...this.activeThreads };
  }

  // Global Character Methods
  getOrCreatePlayer(userId) {
    if (!this.globalCharacters[userId]) {
      this.globalCharacters[userId] = new Player(userId);
    }
    return this.globalCharacters[userId];
  }

  getPlayer(userId) {
    return this.globalCharacters[userId] || null;
  }

  getAllPlayers() {
    return { ...this.globalCharacters };
  }

  hasCompleteCharacter(userId) {
    const player = this.getPlayer(userId);
    return player && player.isCharacterComplete();
  }

  getPlayerCount() {
    return Object.keys(this.globalCharacters).length;
  }

  getCompleteCharacterCount() {
    return Object.values(this.globalCharacters)
      .filter(player => player.isCharacterComplete())
      .length;
  }

  // Global Character Methods
  getOrCreatePlayer(userId) {
    if (!this.globalCharacters[userId]) {
      this.globalCharacters[userId] = new Player(userId);
    }
    return this.globalCharacters[userId];
  }

  getPlayer(userId) {
    return this.globalCharacters[userId] || null;
  }

  getAllPlayers() {
    return { ...this.globalCharacters };
  }

  hasCompleteCharacter(userId) {
    const player = this.getPlayer(userId);
    return player && player.isCharacterComplete();
  }

  getPlayerCount() {
    return Object.keys(this.globalCharacters).length;
  }

  getCompleteCharacterCount() {
    return Object.values(this.globalCharacters)
      .filter(player => player.isCharacterComplete())
      .length;
  }

  // Cleanup Methods
  cleanupCompletedJobs() {
    const beforeCount = this.jobBoard.length;
    this.jobBoard = this.jobBoard.filter(job => 
      job.status !== 'completed' && 
      (Date.now() - new Date(job.created).getTime()) < 24 * 60 * 60 * 1000 // 24 hours
    );
    const afterCount = this.jobBoard.length;
    return beforeCount - afterCount;
  }

  cleanupOldThreads() {
    const beforeCount = Object.keys(this.activeThreads).length;
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    
    Object.keys(this.activeThreads).forEach(jobId => {
      const thread = this.activeThreads[jobId];
      if (new Date(thread.created).getTime() < cutoffTime) {
        delete this.activeThreads[jobId];
      }
    });
    
    const afterCount = Object.keys(this.activeThreads).length;
    return beforeCount - afterCount;
  }

  // Serialization Methods (for potential persistence)
  serialize() {
    return {
      jobBoard: this.jobBoard.map(job => job.toJSON()),
      activeGames: Object.fromEntries(
        Object.entries(this.activeGames).map(([id, adventure]) => [id, adventure.toJSON()])
      ),
      activeThreads: { ...this.activeThreads }
    };
  }

  deserialize(data) {
    if (data.jobBoard) {
      this.jobBoard = data.jobBoard.map(jobData => Job.fromJSON(jobData));
    }
    
    if (data.activeGames) {
      this.activeGames = Object.fromEntries(
        Object.entries(data.activeGames).map(([id, adventureData]) => 
          [id, Adventure.fromJSON(adventureData)]
        )
      );
    }
    
    if (data.activeThreads) {
      this.activeThreads = { ...data.activeThreads };
    }
  }

  // Statistics Methods
  getStats() {
    return {
      totalJobs: this.jobBoard.length,
      openJobs: this.getOpenJobs().length,
      activeAdventures: Object.keys(this.activeGames).length,
      activeThreads: Object.keys(this.activeThreads).length
    };
  }

  // Clear all data (for testing or reset)
  clear() {
    this.jobBoard = [];
    this.activeGames = {};
    this.activeThreads = {};
    this.globalCharacters = {};
  }
}

// Create singleton instance
const gameStorage = new GameStorage();

export { gameStorage, GameStorage };