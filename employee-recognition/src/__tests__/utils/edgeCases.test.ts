import {
  getErrorMessage,
  getErrorCode,
  createErrorResponse,
  isError,
  isAppError
} from '../../utils/errorHandler';
import {
  validateJwtToken,
  validateWebhookPayload,
  validateSlackEvent,
  validateTeamsEvent
} from '../../utils/validation';
import {
  sendSuccessResponse,
  sendErrorResponse,
  createHealthResponse
} from '../../utils/responseHelpers';

// Mock Express Response
const mockResponse = () => {
  const res = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Edge Cases and Error Scenarios', () => {
  describe('Error Handler Edge Cases', () => {
    it('should handle circular reference objects', () => {
      const circularObj: any = { message: 'test' };
      circularObj.self = circularObj;
      
      expect(() => getErrorMessage(circularObj)).not.toThrow();
      expect(getErrorMessage(circularObj)).toBe('test');
    });

    it('should handle objects with non-string message', () => {
      const objWithNumberMessage = { message: 123 };
      expect(getErrorMessage(objWithNumberMessage)).toBe('123');
      
      const objWithNullMessage = { message: null };
      expect(getErrorMessage(objWithNullMessage)).toBe('null');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new Error(longMessage);
      
      expect(getErrorMessage(error)).toBe(longMessage);
    });

    it('should handle unicode characters in error messages', () => {
      const unicodeMessage = '🚀 Error with emoji: 测试中文 🎉';
      const error = new Error(unicodeMessage);
      
      expect(getErrorMessage(error)).toBe(unicodeMessage);
    });

    it('should handle objects with getter properties', () => {
      const obj = {
        get message() {
          return 'Getter message';
        }
      };
      
      expect(getErrorMessage(obj)).toBe('Getter message');
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle extremely long JWT tokens', () => {
      const longToken = 'Bearer ' + 'a'.repeat(10000) + '.b.c';
      const result = validateJwtToken(longToken);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JWT token format');
    });

    it('should handle JWT tokens with special characters', () => {
      const specialToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = validateJwtToken(specialToken);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle deeply nested webhook payloads', () => {
      const deepPayload = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { message: 'Deep nested' }
              }
            }
          }
        }
      };
      
      const result = validateWebhookPayload(deepPayload);
      expect(result.isValid).toBe(true);
    });

    it('should handle Slack events with missing optional fields', () => {
      const minimalEvent = { type: 'message' };
      const result = validateSlackEvent(minimalEvent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message text is required for message events');
    });

    it('should handle Teams events with empty strings', () => {
      const eventWithEmptyText = { type: 'message', text: '' };
      const result = validateTeamsEvent(eventWithEmptyText);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message text is required for message events');
    });
  });

  describe('Response Helper Edge Cases', () => {
    it('should handle null data in success response', () => {
      const res = mockResponse();
      
      expect(() => sendSuccessResponse(res, null)).not.toThrow();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        timestamp: expect.any(String)
      });
    });

    it('should handle undefined data in success response', () => {
      const res = mockResponse();
      
      expect(() => sendSuccessResponse(res, undefined)).not.toThrow();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: undefined,
        timestamp: expect.any(String)
      });
    });

    it('should handle very large data objects', () => {
      const res = mockResponse();
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }))
      };
      
      expect(() => sendSuccessResponse(res, largeData)).not.toThrow();
    });

    it('should handle error responses with complex error objects', () => {
      const res = mockResponse();
      const complexError = {
        message: 'Complex error',
        code: 'COMPLEX_ERROR',
        details: {
          field: 'email',
          reason: 'Invalid format',
          suggestions: ['Use valid email format']
        },
        stack: 'Error stack trace...'
      };
      
      sendErrorResponse(res, complexError);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Operation failed',
        message: 'Complex error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle rapid successive calls', () => {
      const res = mockResponse();
      
      // Make many rapid calls
      for (let i = 0; i < 100; i++) {
        sendSuccessResponse(res, { id: i });
      }
      
      expect(res.json).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent error processing', () => {
      const res = mockResponse();
      const errors = [
        new Error('Error 1'),
        'String error 2',
        { message: 'Object error 3' },
        null,
        undefined
      ];
      
      errors.forEach(error => {
        sendErrorResponse(res, error);
      });
      
      expect(res.json).toHaveBeenCalledTimes(errors.length);
    });
  });

  describe('Memory Edge Cases', () => {
    it('should not create memory leaks with large objects', () => {
      const largeObject = {
        data: Array.from({ length: 10000 }, (_, i) => ({ id: i, value: i.toString() }))
      };
      
      // Create many responses with large objects
      for (let i = 0; i < 100; i++) {
        const largeObject = Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`service${i}`, 'ok'])
        );
        
        const response = createHealthResponse(largeObject);
        expect(response).toBeDefined();
      }
    });
  });

  describe('Type Safety Edge Cases', () => {
    it('should handle all possible unknown error types', () => {
      const errorTypes = [
        null,
        undefined,
        'string error',
        123,
        true,
        false,
        [],
        {},
        new Error('Standard error'),
        new TypeError('Type error'),
        new RangeError('Range error'),
        { message: 'Object with message' },
        { code: 'Object with code' },
        { message: 123, code: 'mixed' },
        Symbol('symbol'),
        () => 'function error'
      ];
      
      errorTypes.forEach(error => {
        expect(() => getErrorMessage(error)).not.toThrow();
        expect(typeof getErrorMessage(error)).toBe('string');
      });
    });
  });
});

