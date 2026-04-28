import { MESSAGES } from '../config/constants.js';

/**
 * Game helper functions
 */

/**
 * Format a message template with variables
 * @param {string} template - Message template
 * @param {Object} variables - Variables to substitute
 * @returns {string} - Formatted message
 */
export function formatMessage(template, variables = {}) {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Get next player index in rotation
 * @param {number} currentIndex - Current player index
 * @param {number} totalPlayers - Total number of players
 * @returns {number} - Next player index
 */
export function getNextPlayerIndex(currentIndex, totalPlayers) {
  return (currentIndex + 1) % totalPlayers;
}

/**
 * Get previous player index in rotation
 * @param {number} currentIndex - Current player index
 * @param {number} totalPlayers - Total number of players
 * @returns {number} - Previous player index
 */
export function getPrevPlayerIndex(currentIndex, totalPlayers) {
  return (currentIndex - 1 + totalPlayers) % totalPlayers;
}

/**
 * Calculate gift recipient based on turn and gift type
 * @param {number} currentTurn - Current turn index
 * @param {string} giftType - Type of gift ('skill' or 'item')
 * @param {number} totalPlayers - Total number of players
 * @returns {number} - Recipient index
 */
export function getGiftRecipientIndex(currentTurn, giftType, totalPlayers) {
  if (giftType === 'skill') {
    return getNextPlayerIndex(currentTurn, totalPlayers);
  } else {
    return getPrevPlayerIndex(currentTurn, totalPlayers);
  }
}

/**
 * Generate unique ID for adventures
 * @param {string} jobId - Job ID
 * @returns {string} - Adventure ID
 */
export function generateAdventureId(jobId) {
  return `adventure_${jobId}`;
}

/**
 * Generate unique ID for jobs
 * @returns {string} - Job ID
 */
export function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if all participants have completed a phase
 * @param {Object} phaseData - Phase completion data
 * @param {Array} participants - Array of participant IDs
 * @param {Function} checkFunction - Function to check completion for a participant
 * @returns {boolean} - Whether all participants have completed
 */
export function allParticipantsCompleted(phaseData, participants, checkFunction) {
  return participants.every(participantId => 
    checkFunction(phaseData[participantId])
  );
}

/**
 * Count completed participants in a phase
 * @param {Object} phaseData - Phase completion data
 * @param {Array} participants - Array of participant IDs
 * @param {Function} checkFunction - Function to check completion for a participant
 * @returns {number} - Number of participants who have completed
 */
export function countCompletedParticipants(phaseData, participants, checkFunction) {
  return participants.filter(participantId => 
    checkFunction(phaseData[participantId])
  ).length;
}

/**
 * Create a formatted participant list for display
 * @param {Array} participants - Array of participant IDs
 * @returns {string} - Formatted participant string
 */
export function formatParticipantList(participants) {
  return participants.join('>, <@');
}

/**
 * Truncate text for Discord thread names
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 80)
 * @returns {string} - Truncated text
 */
export function truncateForThreadName(text, maxLength = 80) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Create a status message for ready/waiting states
 * @param {number} currentPlayers - Current number of players
 * @param {number} minPlayers - Minimum required players
 * @returns {string} - Status message
 */
export function getPlayerStatusMessage(currentPlayers, minPlayers) {
  if (currentPlayers >= minPlayers) {
    return '🎲 **Ready to start!** Use `/start` in your adventure thread when ready.';
  } else {
    const needed = minPlayers - currentPlayers;
    return `⏳ Need ${needed} more player${needed > 1 ? 's' : ''} to start.`;
  }
}

/**
 * Deduplicate array while preserving order
 * @param {Array} array - Array to deduplicate
 * @returns {Array} - Deduplicated array
 */
export function deduplicate(array) {
  return [...new Set(array)];
}

/**
 * Safe array access with default value
 * @param {Array} array - Array to access
 * @param {number} index - Index to access
 * @param {*} defaultValue - Default value if index is out of bounds
 * @returns {*} - Array value or default
 */
export function safeArrayAccess(array, index, defaultValue = null) {
  return array && array[index] !== undefined ? array[index] : defaultValue;
}