/**
 * Utility functions for error handling and type safety
 */

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

/**
 * Safely extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Safely extracts error code from unknown error type
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return undefined;
}

/**
 * Creates a standardized error response object
 */
export function createErrorResponse(error: unknown, context?: string) {
  return {
    error: context || 'Operation failed',
    message: getErrorMessage(error),
    code: getErrorCode(error),
    timestamp: new Date().toISOString()
  };
}

/**
 * Type guard to check if error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return isError(error) && 'code' in error;
}

