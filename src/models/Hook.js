import { generateHookId } from '../utils/gameHelpers.js';
import { GAME_CONSTANTS } from '../config/constants.js';


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
    this.threadId = null;
  }


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


  getAllParticipants() {
    return [...this.participants];
  }


  getTotalParticipants() {
    return this.participants.length + 1; // +1 for poster
  }


  isUserInvolved(userId) {
    return this.participants.includes(userId);
  }


  canUserJoin(userId) {
    if (userId === this.postedBy) {
      return !this.participants.includes(userId); // Poster can join if not already a participant
    }
    return this.status === 'open' && !this.participants.includes(userId);
  }


  isReadyToStart() {
    const totalParticipants = this.participants.length; // Don't auto-include poster
    
    return {
      ready: totalParticipants >= GAME_CONSTANTS.MIN_PLAYERS,
      totalParticipants,
      needed: Math.max(0, GAME_CONSTANTS.MIN_PLAYERS - totalParticipants)
    };
  }


  markInProgress() {
    this.status = 'in-progress';
  }


  markCompleted() {
    this.status = 'completed';
  }


  canAcceptParticipants() {
    return this.status === 'open';
  }


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


  toJSON() {
    return {
      id: this.id,
      description: this.description,
      postedBy: this.postedBy,
      channelId: this.channelId,
      guildId: this.guildId || null,
      participants: this.participants,
      created: this.created,
      status: this.status,
      threadId: this.threadId || null
    };
  }


  static fromJSON(data) {
    const hook = Object.create(Hook.prototype);
    return Object.assign(hook, data, {
      created: new Date(data.created)
    });
  }
}