export function generateAdventureId(jobId) {
  return `adventure_${jobId}`;
}

export function generateHookId() {
  return `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function truncateForThreadName(text, maxLength = 80) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function deduplicate(array) {
  return [...new Set(array)];
}