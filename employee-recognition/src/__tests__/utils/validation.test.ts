import {
  validateJwtToken,
  validateWebhookPayload,
  validateSlackEvent,
  validateTeamsEvent
} from '../../utils/validation';

describe('Validation Utils', () => {
  describe('validateJwtToken', () => {
    it('should validate correct JWT token format', () => {
      const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = validateJwtToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty token', () => {
      const result = validateJwtToken('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Token is required');
    });

    it('should reject token without Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = validateJwtToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Token must start with "Bearer "');
    });

    it('should reject invalid JWT format', () => {
      const token = 'Bearer invalid.jwt.format';
      const result = validateJwtToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JWT token format');
    });

    it('should reject JWT token that is too long', () => {
      const longToken = 'Bearer ' + 'a'.repeat(2000) + '.b.c';
      const result = validateJwtToken(longToken);
    
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JWT token format');
    });
  });

  describe('validateWebhookPayload', () => {
    it('should validate valid payload object', () => {
      const payload = { event: 'test', data: { id: 1 } };
      const result = validateWebhookPayload(payload);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null payload', () => {
      const result = validateWebhookPayload(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payload is required');
    });

    it('should reject non-object payload', () => {
      const result = validateWebhookPayload('string payload');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payload must be an object');
    });
  });

  describe('validateSlackEvent', () => {
    it('should validate valid Slack event', () => {
      const event = { type: 'message', text: 'Hello world' };
      const result = validateSlackEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null event', () => {
      const result = validateSlackEvent(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event is required');
    });

    it('should reject event without type', () => {
      const event = { text: 'Hello world' };
      const result = validateSlackEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event type is required');
    });

    it('should reject message event without text', () => {
      const event = { type: 'message' };
      const result = validateSlackEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message text is required for message events');
    });

    it('should accept non-message events without text', () => {
      const event = { type: 'reaction_added' };
      const result = validateSlackEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTeamsEvent', () => {
    it('should validate valid Teams event', () => {
      const event = { type: 'message', text: 'Hello world' };
      const result = validateTeamsEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null event', () => {
      const result = validateTeamsEvent(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event is required');
    });

    it('should reject event without type', () => {
      const event = { text: 'Hello world' };
      const result = validateTeamsEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event type is required');
    });

    it('should reject message event without text', () => {
      const event = { type: 'message' };
      const result = validateTeamsEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message text is required for message events');
    });

    it('should accept non-message events without text', () => {
      const event = { type: 'conversationUpdate' };
      const result = validateTeamsEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

