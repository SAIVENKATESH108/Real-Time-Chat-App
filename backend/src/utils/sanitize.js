import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizes chat message text to eliminate XSS risks while preserving harmless text.
 * Strips all HTML tags and attributes.
 * 
 * @param {string} text - Raw input text from client
 * @returns {string} Sanitized clean text
 */
export function sanitizeMessageContent(text) {
  if (typeof text !== 'string') {
    return '';
  }

  // Strip all HTML tags entirely to prevent XSS injection
  const cleaned = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });

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
