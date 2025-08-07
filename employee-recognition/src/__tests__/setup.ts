// Test setup and global configuration
import 'jest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/recognition_test';

// Mock console methods to reduce noise during tests
const originalConsole = global.console;

global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error for debugging
};

// Global test helpers
beforeAll(() => {
  console.log('🧪 Test suite starting...');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

test('setup runs successfully', () => {
  expect(true).toBe(true);
});