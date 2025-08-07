import {
  getErrorMessage,
  getErrorCode,
  createErrorResponse,
  isError,
  isAppError,
  AppError
} from '../../utils/errorHandler';

describe('Error Handler Utils', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should return string error as is', () => {
      const error = 'String error message';
      expect(getErrorMessage(error)).toBe('String error message');
    });

    it('should extract message from object with message property', () => {
      const error = { message: 'Object error message' };
      expect(getErrorMessage(error)).toBe('Object error message');
    });

    it('should return default message for unknown error types', () => {
      const error = 123;
      expect(getErrorMessage(error)).toBe('An unknown error occurred');
    });

    it('should handle null and undefined', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    });
  });

  describe('getErrorCode', () => {
    it('should extract code from error object', () => {
      const error = { code: 'VALIDATION_ERROR' };
      expect(getErrorCode(error)).toBe('VALIDATION_ERROR');
    });

    it('should return undefined for errors without code', () => {
      const error = new Error('No code here');
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('should handle null and undefined', () => {
      expect(getErrorCode(null)).toBeUndefined();
      expect(getErrorCode(undefined)).toBeUndefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error response', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error, 'Test context');

      expect(response).toMatchObject({
        error: 'Test context',
        message: 'Test error',
        timestamp: expect.any(String)
      });
    });

    it('should use default context when not provided', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error);

      expect(response.error).toBe('Operation failed');
    });

    it('should include code when available', () => {
      const error = { message: 'Test error', code: 'TEST_CODE' };
      const response = createErrorResponse(error);

      expect(response.code).toBe('TEST_CODE');
    });
  });

  describe('isError', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error('Test'))).toBe(true);
      expect(isError(new TypeError('Type error'))).toBe(true);
    });

    it('should return false for non-Error types', () => {
      expect(isError('string error')).toBe(false);
      expect(isError({ message: 'object error' })).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const appError: AppError = new Error('App error') as AppError;
      appError.code = 'APP_ERROR';
      expect(isAppError(appError)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      expect(isAppError(new Error('Regular error'))).toBe(false);
    });

    it('should return false for non-Error types', () => {
      expect(isAppError('string')).toBe(false);
      expect(isAppError({ code: 'test' })).toBe(false);
    });
  });
});

