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