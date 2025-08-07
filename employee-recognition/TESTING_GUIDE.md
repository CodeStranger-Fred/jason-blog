# Testing Guide - Employee Recognition System

## Overview

This guide explains the modular testing approach implemented for the Employee Recognition System, focusing on edge cases, unit tests, and maintainable code structure.

## Code Structure for Better Testing

### 1. Modular Utility Functions

The code has been refactored into digestible modules for better unit testing:

```
src/utils/
├── errorHandler.ts      # Error handling utilities
├── validation.ts        # Input validation functions
├── responseHelpers.ts   # API response helpers
└── auth.ts             # Authentication utilities
```

### 2. Separation of Concerns

Each utility file has a single responsibility:

- **errorHandler.ts**: Safely handles unknown error types and provides type-safe error extraction
- **validation.ts**: Validates different types of input data (JWT tokens, webhook payloads, etc.)
- **responseHelpers.ts**: Standardizes API responses across the application
- **auth.ts**: Handles authentication-related utilities

## Key Improvements Made

### 1. TypeScript Error Resolution

**Problem**: `'error' is of type 'unknown'` errors in catch blocks

**Solution**: Created `getErrorMessage()` utility function that safely extracts error messages:

```typescript
// Before (causing TypeScript errors)
} catch (error) {
  console.error('Error:', error.message); // ❌ error is unknown
}

// After (type-safe)
} catch (error) {
  console.error('Error:', getErrorMessage(error)); // ✅ safe
}
```

### 2. Modular Error Handling

```typescript
// src/utils/errorHandler.ts
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
```

### 3. Standardized API Responses

```typescript
// src/utils/responseHelpers.ts
export function sendErrorResponse(
  res: Response, 
  error: unknown, 
  context?: string, 
  statusCode: number = 500
): void {
  const errorResponse = createErrorResponse(error, context);
  const response: ApiResponse = {
    success: false,
    error: errorResponse.error,
    message: errorResponse.message,
    timestamp: errorResponse.timestamp
  };
  
  res.status(statusCode).json(response);
}
```

## Testing Strategy

### 1. Unit Tests for Utilities

Each utility function has comprehensive unit tests:

```bash
# Run all utility tests
npm run test:utils

# Run specific test files
npm run test:edge-cases
```

### 2. Edge Case Coverage

The `edgeCases.test.ts` file covers:

- **Error Type Safety**: All possible unknown error types
- **Performance**: Rapid successive calls and memory usage
- **Input Validation**: Extreme values, special characters, deep nesting
- **Memory Leaks**: Large object handling
- **Unicode Support**: International characters and emojis

### 3. Test Categories

#### Error Handler Tests
- Error message extraction from various types
- Error code extraction
- Type guards for error classification
- Standardized error response creation

#### Validation Tests
- JWT token format validation
- Webhook payload structure validation
- Slack/Teams event validation
- Edge cases with invalid inputs

#### Response Helper Tests
- Success response formatting
- Error response formatting
- Platform-specific responses (Slack, Teams)
- Health check response generation

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run only utility tests
npm run test:utils

# Run edge case tests
npm run test:edge-cases
```

## Test Coverage Areas

### 1. Error Handling Edge Cases
- ✅ Circular reference objects
- ✅ Non-string message properties
- ✅ Very long error messages
- ✅ Unicode characters
- ✅ Getter properties
- ✅ All possible unknown types

### 2. Validation Edge Cases
- ✅ Extremely long JWT tokens
- ✅ Special characters in tokens
- ✅ Deeply nested payloads
- ✅ Missing optional fields
- ✅ Empty strings

### 3. Response Helper Edge Cases
- ✅ Null/undefined data
- ✅ Very large data objects
- ✅ Complex error objects
- ✅ Rapid successive calls
- ✅ Memory leak prevention

