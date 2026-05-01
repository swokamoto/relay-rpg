import { Adventure } from '../models/Adventure.js';
import { Job } from '../models/Job.js';
import { Player } from '../models/Player.js';
import db from './db.js';

// Prepared statements
const stmts = {
  // Players
  upsertPlayer: db.prepare('INSERT OR REPLACE INTO players (user_id, data) VALUES (?, ?)'),
  getPlayer: db.prepare('SELECT data FROM players WHERE user_id = ?'),
  getAllPlayers: db.prepare('SELECT data FROM players'),
  countPlayers: db.prepare('SELECT COUNT(*) as count FROM players'),

  // Jobs
  insertJob: db.prepare('INSERT INTO jobs (id, status, data) VALUES (?, ?, ?)'),
  updateJob: db.prepare('UPDATE jobs SET status = ?, data = ? WHERE id = ?'),
  getJob: db.prepare('SELECT data FROM jobs WHERE id = ?'),
  getAllJobs: db.prepare('SELECT data FROM jobs'),
  getOpenJobs: db.prepare('SELECT data FROM jobs WHERE status = ?'),
  deleteJob: db.prepare('DELETE FROM jobs WHERE id = ?'),
  cleanupJobs: db.prepare("DELETE FROM jobs WHERE status = 'completed' OR (json_extract(data, '$.created') < ?)"),

  // Adventures
  insertAdventure: db.prepare('INSERT INTO adventures (id, thread_id, job_id, data) VALUES (?, ?, ?, ?)'),
  updateAdventure: db.prepare('UPDATE adventures SET data = ? WHERE id = ?'),
  getAdventure: db.prepare('SELECT data FROM adventures WHERE id = ?'),
  getAdventureByThread: db.prepare('SELECT data FROM adventures WHERE thread_id = ?'),
  getAdventureByJob: db.prepare('SELECT data FROM adventures WHERE job_id = ?'),
  getAllAdventures: db.prepare('SELECT data FROM adventures'),
  deleteAdventure: db.prepare('DELETE FROM adventures WHERE id = ?'),

  // Threads
  insertThread: db.prepare('INSERT OR REPLACE INTO threads (job_id, thread_id, data) VALUES (?, ?, ?)'),
  getThread: db.prepare('SELECT data FROM threads WHERE job_id = ?'),
  getThreadByThreadId: db.prepare('SELECT data FROM threads WHERE thread_id = ?'),
  getAllThreads: db.prepare('SELECT data FROM threads'),
  deleteThread: db.prepare('DELETE FROM threads WHERE job_id = ?'),
  cleanupThreads: db.prepare("DELETE FROM threads WHERE json_extract(data, '$.created') < ?"),
};

class GameStorage {
  // ─── Job Board ───────────────────────────────────────────────────────────────

  addJob(job) {
    stmts.insertJob.run(job.id, job.status, JSON.stringify(job.toJSON()));
    return job;
  }

  findJob(jobId) {
    const row = stmts.getJob.get(jobId);
    return row ? Job.fromJSON(JSON.parse(row.data)) : null;
  }

  updateJob(job) {
    const changes = stmts.updateJob.run(job.status, JSON.stringify(job.toJSON()), job.id);
    return changes.changes > 0 ? job : null;
  }

  removeJob(jobId) {
    const job = this.findJob(jobId);
    if (job) stmts.deleteJob.run(jobId);
    return job;
  }

  getJobBoard() {
    return stmts.getAllJobs.all().map(row => Job.fromJSON(JSON.parse(row.data)));
  }

  getOpenJobs() {
    return stmts.getOpenJobs.all('open')
      .map(row => Job.fromJSON(JSON.parse(row.data)))
      .filter(job => job.canAcceptParticipants());
  }

  isUserInAnyJob(userId) {
    return stmts.getOpenJobs.all('open')
      .map(row => Job.fromJSON(JSON.parse(row.data)))
      .some(job => job.isUserInvolved(userId));
  }

  getUserActiveJob(userId) {
    return stmts.getOpenJobs.all('open')
      .map(row => Job.fromJSON(JSON.parse(row.data)))
      .find(job => job.isUserInvolved(userId)) || null;
  }

  // ─── Adventures ──────────────────────────────────────────────────────────────

  addAdventure(adventure) {
    stmts.insertAdventure.run(adventure.id, adventure.threadId, adventure.jobId, JSON.stringify(adventure.toJSON()));
    return adventure;
  }

  findAdventure(adventureId) {
    const row = stmts.getAdventure.get(adventureId);
    return row ? Adventure.fromJSON(JSON.parse(row.data)) : null;
  }

  findAdventureByThread(threadId) {
    const row = stmts.getAdventureByThread.get(threadId);
    return row ? Adventure.fromJSON(JSON.parse(row.data)) : null;
  }

  findAdventureByJobId(jobId) {
    const row = stmts.getAdventureByJob.get(jobId);
    return row ? Adventure.fromJSON(JSON.parse(row.data)) : null;
  }

  updateAdventure(adventure) {
    stmts.updateAdventure.run(JSON.stringify(adventure.toJSON()), adventure.id);
    return adventure;
  }

  removeAdventure(adventureId) {
    const adventure = this.findAdventure(adventureId);
    if (adventure) stmts.deleteAdventure.run(adventureId);
    return adventure;
  }

  getActiveAdventures() {
    const result = {};
    stmts.getAllAdventures.all().forEach(row => {
      const adv = Adventure.fromJSON(JSON.parse(row.data));
      result[adv.id] = adv;
    });
    return result;
  }

  // ─── Threads ─────────────────────────────────────────────────────────────────

  addThread(jobId, threadInfo) {
    stmts.insertThread.run(jobId, threadInfo.threadId, JSON.stringify(threadInfo));
    return threadInfo;
  }

  findThread(jobId) {
    const row = stmts.getThread.get(jobId);
    return row ? JSON.parse(row.data) : null;
  }

  findThreadByThreadId(threadId) {
    const row = stmts.getThreadByThreadId.get(threadId);
    return row ? JSON.parse(row.data) : null;
  }

  removeThread(jobId) {
    const thread = this.findThread(jobId);
    if (thread) stmts.deleteThread.run(jobId);
    return thread;
  }

  getActiveThreads() {
    const result = {};
    stmts.getAllThreads.all().forEach(row => {
      const thread = JSON.parse(row.data);
      result[thread.jobId] = thread;
    });
    return result;
  }

  // ─── Players ─────────────────────────────────────────────────────────────────

  getOrCreatePlayer(userId) {
    const row = stmts.getPlayer.get(userId);
    if (row) return Player.fromJSON(JSON.parse(row.data));
    const player = new Player(userId);
    stmts.upsertPlayer.run(userId, JSON.stringify(player.toJSON()));
    return player;
  }

  getPlayer(userId) {
    const row = stmts.getPlayer.get(userId);
    return row ? Player.fromJSON(JSON.parse(row.data)) : null;
  }

  savePlayer(player) {
    stmts.upsertPlayer.run(player.userId, JSON.stringify(player.toJSON()));
    return player;
  }

  getAllPlayers() {
    const result = {};
    stmts.getAllPlayers.all().forEach(row => {
      const player = Player.fromJSON(JSON.parse(row.data));
      result[player.userId] = player;
    });
    return result;
  }

  hasCompleteCharacter(userId) {
    const player = this.getPlayer(userId);
    return player ? player.isCharacterComplete() : false;
  }

  getPlayerCount() {
    return stmts.countPlayers.get().count;
  }

  getCompleteCharacterCount() {
    return stmts.getAllPlayers.all()
      .map(row => Player.fromJSON(JSON.parse(row.data)))
      .filter(player => player.isCharacterComplete())
      .length;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  cleanupCompletedJobs() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = stmts.cleanupJobs.run(cutoff);
    return result.changes;
  }

  cleanupOldThreads() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = stmts.cleanupThreads.run(cutoff);
    return result.changes;
  }

  // ─── Statistics ──────────────────────────────────────────────────────────────

  getStats() {
    return {
      totalJobs: this.getJobBoard().length,
      openJobs: this.getOpenJobs().length,
      activeAdventures: Object.keys(this.getActiveAdventures()).length,
      activeThreads: Object.keys(this.getActiveThreads()).length
    };
  }

  // ─── Clear (testing/reset) ───────────────────────────────────────────────────

  clear() {
    db.exec('DELETE FROM players; DELETE FROM jobs; DELETE FROM adventures; DELETE FROM threads;');
  }
}

// Create singleton instance
const gameStorage = new GameStorage();

export { gameStorage, GameStorage };