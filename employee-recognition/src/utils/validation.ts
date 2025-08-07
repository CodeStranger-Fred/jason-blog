/**
 * Validation utility functions
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates JWT token format
 */
export function validateJwtToken(token: string): ValidationResult {
  const errors: string[] = [];
  
  if (!token) {
    errors.push('Token is required');
    return { isValid: false, errors };
  }

  if (!token.startsWith('Bearer ')) {
    errors.push('Token must start with "Bearer "');
    return { isValid: false, errors };
  }

  const parts = token.slice(7).split('.');
  if (parts.length !== 3) {
    errors.push('Invalid JWT token format');
  } else {
    try {
      JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    } catch {
      errors.push('Invalid JWT token format');
    }
  }

  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates webhook payload structure
 */
export function validateWebhookPayload(payload: any): ValidationResult {
  const errors: string[] = [];
  
  if (!payload) {
    errors.push('Payload is required');
    return { isValid: false, errors };
  }
  
  if (typeof payload !== 'object') {
    errors.push('Payload must be an object');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates Slack event structure
 */
export function validateSlackEvent(event: any): ValidationResult {
  const errors: string[] = [];
  
  if (!event) {
    errors.push('Event is required');
    return { isValid: false, errors };
  }
  
  if (!event.type) {
    errors.push('Event type is required');
  }
  
  if (event.type === 'message' && !event.text) {
    errors.push('Message text is required for message events');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates Teams event structure
 */
export function validateTeamsEvent(event: any): ValidationResult {
  const errors: string[] = [];
  
  if (!event) {
    errors.push('Event is required');
    return { isValid: false, errors };
  }
  
  if (!event.type) {
    errors.push('Event type is required');
  }
  
  if (event.type === 'message' && !event.text) {
    errors.push('Message text is required for message events');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

