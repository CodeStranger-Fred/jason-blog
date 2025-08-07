/**
 * Response helper utilities for consistent API responses
 */

import { Response } from 'express';
import { createErrorResponse } from './errorHandler';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Sends a successful response
 */
export function sendSuccessResponse<T>(
  res: Response, 
  data: T, 
  message?: string, 
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
  
  res.status(statusCode).json(response);
}

/**
 * Sends an error response
 */
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

/**
 * Sends a Slack-specific response
 */
export function sendSlackResponse(
  res: Response,
  text: string,
  attachments?: any[],
  responseType: 'in_channel' | 'ephemeral' = 'in_channel'
): void {
  const response: any = {
    response_type: responseType,
    text
  };
  
  if (attachments) {
    response.attachments = attachments;
  }
  
  res.json(response);
}

/**
 * Sends a Teams-specific response
 */
export function sendTeamsResponse(
  res: Response,
  text: string,
  attachments?: any[]
): void {
  const response: any = {
    type: 'message',
    text
  };
  
  if (attachments) {
    response.attachments = attachments;
  }
  
  res.json(response);
}

/**
 * Creates a health check response
 */
export function createHealthResponse(services: Record<string, string> = {}): ApiResponse {
  return {
    success: true,
    data: {
      status: 'healthy',
      services,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
}

