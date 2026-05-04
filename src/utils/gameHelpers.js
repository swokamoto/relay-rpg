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
 * Generate unique ID for adventures
 * @param {string} jobId - Job ID
 * @returns {string} - Adventure ID
 */
export function generateAdventureId(jobId) {
  return `adventure_${jobId}`;
}

/**
 * Generate unique ID for hooks
 * @returns {string} - Hook ID
 */
export function generateHookId() {
  return `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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