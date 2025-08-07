import { Response } from 'express';
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendSlackResponse,
  sendTeamsResponse,
  createHealthResponse
} from '../../utils/responseHelpers';

// Mock Express Response
const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Response Helper Utils', () => {
  describe('sendSuccessResponse', () => {
    it('should send success response with data', () => {
      const res = mockResponse();
      const data = { id: 1, name: 'Test' };
      
      sendSuccessResponse(res, data, 'Success message');
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Success message',
        timestamp: expect.any(String)
      });
    });

    it('should send success response without message', () => {
      const res = mockResponse();
      const data = { id: 1 };
      
      sendSuccessResponse(res, data);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        timestamp: expect.any(String)
      });
    });

    it('should send success response with custom status code', () => {
      const res = mockResponse();
      const data = { id: 1 };
      
      sendSuccessResponse(res, data, undefined, 201);
      
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('sendErrorResponse', () => {
    it('should send error response with Error instance', () => {
      const res = mockResponse();
      const error = new Error('Test error');
      
      sendErrorResponse(res, error, 'Test context');
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test context',
        message: 'Test error',
        timestamp: expect.any(String)
      });
    });

    it('should send error response with string error', () => {
      const res = mockResponse();
      const error = 'String error message';
      
      sendErrorResponse(res, error);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Operation failed',
        message: 'String error message',
        timestamp: expect.any(String)
      });
    });

    it('should send error response with custom status code', () => {
      const res = mockResponse();
      const error = new Error('Test error');
      
      sendErrorResponse(res, error, 'Test context', 400);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('sendSlackResponse', () => {
    it('should send Slack response with text', () => {
      const res = mockResponse();
      
      sendSlackResponse(res, 'Hello Slack!');
      
      expect(res.json).toHaveBeenCalledWith({
        response_type: 'in_channel',
        text: 'Hello Slack!'
      });
    });

    it('should send Slack response with attachments', () => {
      const res = mockResponse();
      const attachments = [{ color: 'good', text: 'Attachment text' }];
      
      sendSlackResponse(res, 'Hello Slack!', attachments);
      
      expect(res.json).toHaveBeenCalledWith({
        response_type: 'in_channel',
        text: 'Hello Slack!',
        attachments
      });
    });

    it('should send Slack response with ephemeral type', () => {
      const res = mockResponse();
      
      sendSlackResponse(res, 'Hello Slack!', undefined, 'ephemeral');
      
      expect(res.json).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Hello Slack!'
      });
    });
  });

  describe('sendTeamsResponse', () => {
    it('should send Teams response with text', () => {
      const res = mockResponse();
      
      sendTeamsResponse(res, 'Hello Teams!');
      
      expect(res.json).toHaveBeenCalledWith({
        type: 'message',
        text: 'Hello Teams!'
      });
    });

    it('should send Teams response with attachments', () => {
      const res = mockResponse();
      const attachments = [{ contentType: 'card', content: {} }];
      
      sendTeamsResponse(res, 'Hello Teams!', attachments);
      
      expect(res.json).toHaveBeenCalledWith({
        type: 'message',
        text: 'Hello Teams!',
        attachments
      });
    });
  });

  describe('createHealthResponse', () => {
    it('should create health response without services', () => {
      const response = createHealthResponse();
  
      expect(response).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          services: {},
          timestamp: expect.any(String)
        },
        timestamp: expect.any(String)
      });
    });
  
    it('should include provided services in the response', () => {
      const mockServices = {
        redis: 'connected',
        postgres: 'ok'
      };
  
      const response = createHealthResponse(mockServices);
  
      expect(response.data.services).toEqual(mockServices);
      expect(response.data.status).toBe('healthy');
      expect(response.success).toBe(true);
    });
  
    it('should handle large service objects without error', () => {
      const largeService = Array.from({ length: 1000 }, (_, i) => [`service${i}`, 'ok']);
      const services = Object.fromEntries(largeService);
  
      const response = createHealthResponse(services);
  
      expect(Object.keys(response.data.services)).toHaveLength(1000);
    });
  });
});

