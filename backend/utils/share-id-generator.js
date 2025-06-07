// Share ID Generator Utility
// Generates short, unique, URL-safe IDs for shared calculations

/**
 * Generate a random share ID
 * @param {number} length - Length of the ID (default: 8)
 * @returns {string} Random share ID
 */
export function generateShareId(length = 8) {
    // Use URL-safe characters (no ambiguous characters like 0, O, I, l)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * Generate a unique share ID by checking against existing IDs
 * @param {Function} checkExistsFn - Function to check if ID exists
 * @param {number} maxRetries - Maximum retry attempts (default: 10)
 * @returns {Promise<string>} Unique share ID
 */
export async function generateUniqueShareId(checkExistsFn, maxRetries = 10) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
        const shareId = generateShareId();
        
        try {
            const exists = await checkExistsFn(shareId);
            if (!exists) {
                return shareId;
            }
        } catch (error) {
            console.warn(`Error checking share ID existence: ${error.message}`);
            // If we can't check, use the generated ID anyway
            return shareId;
        }
        
        attempts++;
    }
    
    // Fallback: use timestamp-based ID if all attempts failed
    const timestamp = Date.now().toString(36).toUpperCase();
    return `T${timestamp}`;
}

/**
 * Validate share ID format
 * @param {string} shareId - Share ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidShareId(shareId) {
    if (!shareId || typeof shareId !== 'string') {
        return false;
    }
    
    // Should be 8 characters, alphanumeric, uppercase
    const pattern = /^[A-Z0-9]{6,12}$/;
    return pattern.test(shareId);
} 