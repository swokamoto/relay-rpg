import { GAME_CONSTANTS } from '../config/constants.js';

/**
 * Validation helper functions
 */

/**
 * Validate adventure description
 * @param {string} description - Adventure description
 * @returns {Object} - Validation result
 */
export function validateAdventureDescription(description) {
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'Description is required' };
  }

  const trimmed = description.trim();
  
  if (trimmed.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters long' };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'Description must be no more than 200 characters long' };
  }

  return { valid: true, description: trimmed };
}

/**
 * Validate character trait description
 * @param {string} description - Trait description
 * @param {string} traitType - Type of trait (conviction, talent, quirk)
 * @returns {Object} - Validation result
 */
export function validateTraitDescription(description, traitType) {
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'Trait description is required' };
  }

  const trimmed = description.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Trait description must be at least 3 characters long' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Trait description must be no more than 100 characters long' };
  }

  // Validate trait type
  const validTraitTypes = ['conviction', 'talent', 'quirk'];
  if (!validTraitTypes.includes(traitType)) {
    return { valid: false, error: 'Invalid trait type' };
  }

  return { valid: true, description: trimmed, traitType };
}

/**
 * Validate participant count for starting adventure
 * @param {Array} participants - Array of participant IDs
 * @returns {Object} - Validation result
 */
export function validateParticipantCount(participants) {
  if (!Array.isArray(participants)) {
    return { valid: false, error: 'Invalid participants data' };
  }

  if (participants.length < GAME_CONSTANTS.MIN_PLAYERS) {
    return { 
      valid: false, 
      error: `Need at least ${GAME_CONSTANTS.MIN_PLAYERS} players to start an adventure. Current: ${participants.length}` 
    };
  }

  return { valid: true, count: participants.length };
}

/**
 * Sanitize user input to prevent injection
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potentially dangerous characters
    .substring(0, 500); // Limit length
}

/**
 * Validate Discord user ID format
 * @param {string} userId - Discord user ID
 * @returns {boolean} - Whether ID is valid format
 */
export function isValidDiscordId(userId) {
  return /^\d{17,19}$/.test(userId);
}

/**
 * Validate Discord channel ID format
 * @param {string} channelId - Discord channel ID
 * @returns {boolean} - Whether ID is valid format
 */
export function isValidChannelId(channelId) {
  return /^\d{17,19}$/.test(channelId);
}

/**
 * Validate that all character traits are complete
 * @param {Object} characterTraits - Character traits object
 * @returns {Object} - Validation result
 */
export function validateCharacterCompletion(characterTraits) {
  const requiredTraits = ['conviction', 'talent', 'quirk'];
  const missing = [];
  
  for (const trait of requiredTraits) {
    if (!characterTraits[trait] || !characterTraits[trait].description) {
      missing.push(trait);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing traits: ${missing.join(', ')}`,
      missing
    };
  }
  
  return { valid: true };
}