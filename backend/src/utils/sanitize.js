/**
 * Sanitizes chat message text to eliminate XSS risks while preserving harmless text.
 * Strips all HTML tags, script elements, and dangerous characters without external CommonJS dependencies.
 * 
 * @param {string} text - Raw input text from client
 * @returns {string} Sanitized clean text
 */
export function sanitizeMessageContent(text) {
  if (typeof text !== 'string') {
    return '';
  }

  // Strip <script>...</script> and <style>...</style> blocks completely along with their inner content
  const cleaned = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '');

  return cleaned.trim();
}

/**
 * Validates whether the message content is non-empty and within character limits.
 * 
 * @param {string} content - Sanitized content
 * @param {number} [maxLength=5000] - Max allowable length
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateMessageContent(content, maxLength = 5000) {
  if (!content || content.length === 0) {
    return { valid: false, error: 'Message cannot be empty or contain only whitespace.' };
  }
  if (content.length > maxLength) {
    return { valid: false, error: `Message exceeds maximum allowed length of ${maxLength} characters.` };
  }
  return { valid: true };
}
