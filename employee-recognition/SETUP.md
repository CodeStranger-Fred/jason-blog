# Employee Recognition System - Complete Setup Guide

## Prerequisites

- **Node.js 18+** 
- **PostgreSQL 13+** 
- **Git** 

## Quick Start (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Create database
createdb recognition_mvp

# 3. Set up database
psql recognition_mvp -f database/schema.sql

# 4. Start the server
npm run dev
```

## Detailed Setup Steps

### Step 1: Project Setup
```bash
# Create project directory
mkdir recognition-api-mvp
cd recognition-api-mvp
npm install
```

### Step 2: Database Setup
```bash
# Start PostgreSQL service
# macOS: brew services start postgresql
# Windows: Start PostgreSQL from Services

# Create database
createdb recognition_mvp

# Verify connection
psql recognition_mvp -c "SELECT version();"

# Run schema
psql recognition_mvp -f database/schema.sql

# Verify tables
psql recognition_mvp -c "\dt"
```

### Step 3: Environment Configuration
The `.env` file is already configured with development defaults:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/recognition_mvp
JWT_SECRET=mvp-super-secret-key
PORT=4000
NODE_ENV=development
```

### Step 4: Start Development Server
```bash
npm run dev
```

You should see:
```
Database connected successfully
Services initialized
Server ready!
GraphQL endpoint: http://localhost:4000/graphql
Subscriptions endpoint: ws://localhost:4000/graphql
Health check: http://localhost:4000/health
GraphQL Playground: http://localhost:4000/graphql
```

## 🧪 Testing the Setup

### 1. Health Check
```bash
curl http://localhost:4000/health
# Should return: {"status":"OK","timestamp":"...","services":{...}}
```

### 2. GraphQL Playground
Open http://localhost:4000/graphql in your browser

### 3. Login Test
```graphql
mutation {
  login(email: "john@company.com") {
    token
    user {
      id
      name
      role
    }
  }
}
```

### 4. Create Recognition Test
Add Authorization header: `{"Authorization": "Bearer YOUR_TOKEN_HERE"}`

```graphql
mutation {
  createRecognition(input: {
    recipientId: "650e8400-e29b-41d4-a716-446655440002"
    message: "Excellent work on the MVP setup!"
    visibility: PUBLIC
  }) {
    id
    message
    sender { name }
    recipient { name }
    keywords
    createdAt
  }
}
```

### 5. Real-time Subscription Test
Open a new GraphQL Playground tab:
```graphql
subscription {
  recognitionReceived(userId: "650e8400-e29b-41d4-a716-446655440002") {
    id
    message
    sender { name }
  }
}
```

Then create another recognition - should see it appear in real-time

### 6. Analytics Test
```graphql
query {
  teamStats(teamId: "550e8400-e29b-41d4-a716-446655440001") {
    totalCount
    publicCount
    privateCount
    topKeywords
  }
}
```

### 7. Run Unit Tests
```bash
npm test
```
