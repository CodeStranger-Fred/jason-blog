import jwt from 'jsonwebtoken';
import { RecognitionService } from '../services/RecognitionService';
import { UserService } from '../services/UserService';
import { AnalyticsService } from '../services/AnalyticsService';

// Mock database and pubsub
const mockDb = {
  query: jest.fn(),
};

const mockPubsub = {
  publish: jest.fn(),
};

// Test utilities
const validateMessage = (message: string): string[] => {
  const errors: string[] = [];
  
  if (typeof message !== 'string' || message.trim().length === 0) {
    errors.push('Message is required');
    return errors; 
  }
  
  if (message.length > 500) {
    errors.push('Message cannot exceed 500 characters');
  }
  
  if (message.toLowerCase().includes('spam')) {
    errors.push('Message contains inappropriate content');
  }
  
  return errors;
};

const hasRole = (userRole: string, requiredRole: string): boolean => {
  const hierarchy = {
    'EMPLOYEE': 1,
    'MANAGER': 2,
    'HR': 3,
    'ADMIN': 4
  };

  if (!(userRole in hierarchy) || !(requiredRole in hierarchy)) return false;

  const userLevel = hierarchy[userRole as keyof typeof hierarchy];
  const requiredLevel = hierarchy[requiredRole as keyof typeof hierarchy];
  
  return userLevel >= requiredLevel;
};

const extractKeywords = (message: string): string[] => {
  if (typeof message !== 'string') return [];

  const cleaned = message.replace(/[^\w\s]/g, '').toLowerCase();
  const words = cleaned.split(/\s+/);
  return words.filter(word => 
    word.length > 3 && 
    !['this', 'that', 'with', 'have', 'will', 'been', 'from'].includes(word)
  ).slice(0, 5);
};

describe('Service Layer Tests', () => {
  describe('Validation Functions', () => {
    describe('validateMessage', () => {
      it('should accept valid messages', () => {
        const errors = validateMessage('Great work on the project!');
        expect(errors).toHaveLength(0);
      });
      
      it('should reject empty messages', () => {
        const errors = validateMessage('');
        expect(errors).toContain('Message is required');
      });
      
      it('should reject whitespace-only messages', () => {
        const errors = validateMessage('   ');
        expect(errors).toContain('Message is required');
      });
      
      it('should reject messages exceeding 500 characters', () => {
        const longMessage = 'a'.repeat(501);
        const errors = validateMessage(longMessage);
        expect(errors).toContain('Message cannot exceed 500 characters');
      });
      
      it('should reject spam content', () => {
        const errors = validateMessage('This is spam content');
        expect(errors).toContain('Message contains inappropriate content');
      });
      
      it('should accept messages at character limit', () => {
        const maxMessage = 'a'.repeat(500);
        const errors = validateMessage(maxMessage);
        expect(errors).toHaveLength(0);
      });
    });
    
    describe('hasRole', () => {
      it('should allow manager to access employee features', () => {
        expect(hasRole('MANAGER', 'EMPLOYEE')).toBe(true);
      });
      
      it('should not allow employee to access manager features', () => {
        expect(hasRole('EMPLOYEE', 'MANAGER')).toBe(false);
      });
      
      it('should allow HR to access all lower roles', () => {
        expect(hasRole('HR', 'MANAGER')).toBe(true);
        expect(hasRole('HR', 'EMPLOYEE')).toBe(true);
      });
      
      it('should allow admin to access everything', () => {
        expect(hasRole('ADMIN', 'HR')).toBe(true);
        expect(hasRole('ADMIN', 'MANAGER')).toBe(true);
        expect(hasRole('ADMIN', 'EMPLOYEE')).toBe(true);
      });
      
      it('should handle invalid roles gracefully', () => {
        expect(hasRole('INVALID', 'EMPLOYEE')).toBe(false);
        expect(hasRole('EMPLOYEE', 'INVALID')).toBe(false);
      });
    });
    
    describe('extractKeywords', () => {
      it('should extract meaningful keywords', () => {
        const keywords = extractKeywords('Great work on the innovative project');
        expect(keywords).toContain('great');
        expect(keywords).toContain('work');
        expect(keywords).toContain('innovative');
        expect(keywords).toContain('project');
      });
      
      it('should filter out common words', () => {
        const keywords = extractKeywords('this is with have will been from');
        expect(keywords).toHaveLength(0);
      });
      
      it('should limit to 5 keywords', () => {
        const keywords = extractKeywords('excellent outstanding amazing fantastic wonderful brilliant incredible');
        expect(keywords.length).toBeLessThanOrEqual(5);
      });
      
      it('should handle empty strings', () => {
        const keywords = extractKeywords('');
        expect(keywords).toHaveLength(0);
      });
    });
  });
  
  describe('JWT Token Handling', () => {
    it('should generate valid JWT tokens', () => {
      const user = {
        id: 'test-123',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        name: 'Test User'
      };
      
      const token = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '1h' });
      expect(token).toBeTruthy();
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });
    
    it('should handle token expiration', () => {
      const user = { id: 'test-123', email: 'test@example.com', role: 'EMPLOYEE' };
      const expiredToken = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '-1s' });
      
      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET!);
      }).toThrow();
    });
    
    it('should reject invalid tokens', () => {
      expect(() => {
        jwt.verify('invalid-token', process.env.JWT_SECRET!);
      }).toThrow();
    });
  });
  
  describe('UserService', () => {
    let userService: UserService;
    
    beforeEach(() => {
      userService = new UserService(mockDb as any);
    });
    
    describe('login', () => {
      it('should return token and user for valid email', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@company.com',
          name: 'Test User',
          role: 'EMPLOYEE',
          created_at: new Date()
        };
        
        mockDb.query.mockResolvedValue({ rows: [mockUser] });
        
        const result = await userService.login('test@company.com');
        
        expect(result.token).toBeTruthy();
        expect(result.user.email).toBe(mockUser.email);
        expect(result.user.role).toBe(mockUser.role);
      });
      
      it('should throw error for non-existent user', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        
        await expect(userService.login('nonexistent@company.com'))
          .rejects.toThrow('User not found');
      });
    });
    
    describe('role checking', () => {
      it('should correctly identify role permissions', () => {
        expect(userService.hasRole('MANAGER', 'EMPLOYEE')).toBe(true);
        expect(userService.hasRole('EMPLOYEE', 'MANAGER')).toBe(false);
        expect(userService.canAccessTeamAnalytics('MANAGER')).toBe(true);
        expect(userService.canAccessTeamAnalytics('EMPLOYEE')).toBe(false);
        expect(userService.canAccessOrganizationAnalytics('HR')).toBe(true);
        expect(userService.canAccessOrganizationAnalytics('MANAGER')).toBe(false);
      });
    });
  });
  
  describe('RecognitionService', () => {
    let recognitionService: RecognitionService;
    
    beforeEach(() => {
      recognitionService = new RecognitionService(mockDb as any, mockPubsub as any);
    });
    
    describe('createRecognition', () => {
      const validInput = {
        recipientId: 'recipient-123',
        message: 'Great work on the project!',
        visibility: 'PUBLIC' as const,
      };
      
      beforeEach(() => {
        // Mock recipient validation
        mockDb.query.mockImplementation((query: string) => {
          if (query.includes('SELECT id, name, email')) {
            return Promise.resolve({
              rows: [{
                id: 'recipient-123',
                name: 'Recipient User',
                email: 'recipient@company.com'
              }]
            });
          }
          // Mock recognition insertion
          if (query.includes('INSERT INTO recognitions')) {
            return Promise.resolve({
              rows: [{
                id: 'recognition-123',
                sender_id: 'sender-123',
                recipient_id: 'recipient-123',
                message: validInput.message,
                visibility: validInput.visibility,
                keywords: '["great", "work", "project"]',
                created_at: new Date()
              }]
            });
          }
          return Promise.resolve({ rows: [] });
        });
        
        mockPubsub.publish.mockResolvedValue(undefined);
      });
      
      it('should create recognition successfully', async () => {
        const result = await recognitionService.createRecognition('sender-123', validInput);
        
        expect(result).toBeDefined();
        expect(result.message).toBe(validInput.message);
        expect(result.visibility).toBe(validInput.visibility);
        expect(mockDb.query).toHaveBeenCalled();
        expect(mockPubsub.publish).toHaveBeenCalledWith('RECOGNITION_RECEIVED', expect.any(Object));
      });
      
      it('should throw error for empty message', async () => {
        const invalidInput = { ...validInput, message: '' };
        
        await expect(
          recognitionService.createRecognition('sender-123', invalidInput)
        ).rejects.toThrow('Message is required');
      });
      
      it('should throw error for self-recognition', async () => {
        await expect(
          recognitionService.createRecognition('user-123', { ...validInput, recipientId: 'user-123' })
        ).rejects.toThrow('Cannot recognize yourself');
      });
      
      it('should handle anonymous recognition', async () => {
        const anonymousInput = { ...validInput, visibility: 'ANONYMOUS' as const };
        
        mockDb.query.mockImplementation((query: string, values: any[]) => {
          if (query.includes('INSERT INTO recognitions')) {
            expect(values[0]).toBeNull(); // sender_id should be null for anonymous
            return Promise.resolve({
              rows: [{
                id: 'recognition-123',
                sender_id: null,
                recipient_id: 'recipient-123',
                message: anonymousInput.message,
                visibility: 'ANONYMOUS',
                keywords: '["great", "work", "project"]',
                created_at: new Date()
              }]
            });
          }
          return Promise.resolve({
            rows: [{
              id: 'recipient-123',
              name: 'Recipient User',
              email: 'recipient@company.com'
            }]
          });
        });
        
        const result = await recognitionService.createRecognition('sender-123', anonymousInput);
        expect(result.sender).toBeNull();
      });
    });
  });
  
  describe('AnalyticsService', () => {
    let analyticsService: AnalyticsService;
    
    beforeEach(() => {
      analyticsService = new AnalyticsService(mockDb as any);
    });
    
    describe('getTeamStats', () => {
      it('should return team statistics for authorized users', async () => {
        mockDb.query.mockImplementation((query: string) => {
          if (query.includes('COUNT(*) as total')) {
            return Promise.resolve({
              rows: [{
                total: '10',
                public_count: '7',
                private_count: '2',
                anonymous_count: '1'
              }]
            });
          }
          // Mock keywords query
          return Promise.resolve({
            rows: [
              { keyword: 'excellent', count: '5' },
              { keyword: 'great', count: '3' },
              { keyword: 'outstanding', count: '2' }
            ]
          });
        });
        
        const result = await analyticsService.getTeamStats('team-123', 'MANAGER');
        
        expect(result.totalCount).toBe(10);
        expect(result.publicCount).toBe(7);
        expect(result.privateCount).toBe(2);
        expect(result.anonymousCount).toBe(1);
        expect(result.topKeywords).toContain('excellent');
      });
      
      it('should throw error for unauthorized users', async () => {
        await expect(
          analyticsService.getTeamStats('team-123', 'EMPLOYEE')
        ).rejects.toThrow('Insufficient permissions');
      });
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const userService = new UserService(mockDb as any);
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(userService.login('test@company.com'))
        .rejects.toThrow('Database connection failed');
    });
    
    it('should handle null/undefined inputs gracefully', () => {
      expect(validateMessage(null as any)).toContain('Message is required');
      expect(validateMessage(undefined as any)).toContain('Message is required');
      expect(extractKeywords(null as any)).toHaveLength(0);
      expect(extractKeywords(undefined as any)).toHaveLength(0);
    });
    
    it('should handle special characters in messages', () => {
      const specialMessage = 'Great work! 🎉 Score: 100% - Outstanding (really amazing)';
      const errors = validateMessage(specialMessage);
      expect(errors).toHaveLength(0);
      
      const keywords = extractKeywords(specialMessage);
      expect(keywords).toContain('great');
      expect(keywords).toContain('work');
      expect(keywords).toContain('outstanding');
    });
  });
  
  describe('Performance Tests', () => {
    it('should handle large keyword extraction efficiently', () => {
      const longMessage = 'excellent '.repeat(100) + 'work project team collaboration innovation';
      
      const start = Date.now();
      const keywords = extractKeywords(longMessage);
      const duration = Date.now() - start;
      
      expect(keywords.length).toBeLessThanOrEqual(5);
      expect(duration).toBeLessThan(100); // Should be fast
    });
    
    it('should validate multiple messages efficiently', () => {
      const messages = Array(100).fill('Great work on the project!');
      
      const start = Date.now();
      messages.forEach(message => validateMessage(message));
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should process quickly
    });
  });
});