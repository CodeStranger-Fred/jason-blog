-- Employee Recognition System Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'MANAGER', 'HR', 'ADMIN');
CREATE TYPE visibility AS ENUM ('PUBLIC', 'PRIVATE', 'ANONYMOUS');

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Recognitions table
CREATE TABLE recognitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id), -- NULL for anonymous
    recipient_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    visibility visibility NOT NULL,
    keywords JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_recognitions_recipient ON recognitions(recipient_id);
CREATE INDEX idx_recognitions_sender ON recognitions(sender_id);
CREATE INDEX idx_recognitions_created_at ON recognitions(created_at);
CREATE INDEX idx_recognitions_visibility ON recognitions(visibility);
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_users_role ON users(role);

-- Sample data for testing
INSERT INTO teams (id, name, description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Engineering', 'Software development team'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Marketing', 'Marketing and growth team'),
    ('550e8400-e29b-41d4-a716-446655440003', 'HR', 'Human resources team');

INSERT INTO users (id, email, name, role, team_id) VALUES 
    ('650e8400-e29b-41d4-a716-446655440001', 'john@company.com', 'John Doe', 'MANAGER', '550e8400-e29b-41d4-a716-446655440001'),
    ('650e8400-e29b-41d4-a716-446655440002', 'jane@company.com', 'Jane Smith', 'EMPLOYEE', '550e8400-e29b-41d4-a716-446655440001'),
    ('650e8400-e29b-41d4-a716-446655440003', 'bob@company.com', 'Bob Wilson', 'HR', '550e8400-e29b-41d4-a716-446655440003'),
    ('650e8400-e29b-41d4-a716-446655440004', 'alice@company.com', 'Alice Brown', 'EMPLOYEE', '550e8400-e29b-41d4-a716-446655440002');

INSERT INTO recognitions (sender_id, recipient_id, message, visibility, keywords) VALUES 
    ('650e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'Excellent work on the project delivery!', 'PUBLIC', '["excellent", "work", "project", "delivery"]'),
    ('650e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004', 'Great collaboration on the marketing campaign', 'PUBLIC', '["great", "collaboration", "marketing", "campaign"]'),
    (NULL, '650e8400-e29b-41d4-a716-446655440001', 'Outstanding leadership during the crisis', 'ANONYMOUS', '["outstanding", "leadership", "crisis"]');

-- Verify installation
SELECT 'Database setup complete!' as status;