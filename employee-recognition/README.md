# Employee Recognition System API

## Overview
This document outlines the design and implementation of a real-time employee recognition system built with GraphQL. The system enables employees to recognize each other with messages and emojis while providing comprehensive analytics and role-based access control.

### Visibility Rules(In RBAC.md)

### GraphQL Schema Coverage (In schema.graphql)

### Fileds And Operations (In opeationsEnFiledDescriptions.md)

### Designs And Conflicts (In DECISIONS.md)

### Test Unit Tests And Edge Cases (In TESTING_GUIDE.md)




## Requirements Analysis & Decisions

### Core Requirements Interpretation

- **Recognition Types**: Support for public, private, and anonymous recognitions
- **Real-time Notifications**: GraphQL subscriptions with fallback batching  
- **Role-based Access**: Different permissions for employees, managers, HR, and admins
- **Analytics Foundation**: Data structures optimized for team and keyword analytics
- **Future Extensibility**: Schema designed to accommodate badges, reactions, and comments

### Conflicting Requirements Resolution

**"Real-time is a must"**
- **Decision**: Implement hybrid approach with WebSocket subscriptions for immediate delivery and 10-minute batch fallback for offline users
- **Rationale**: Provides best user experience while ensuring delivery reliability

**Integration Requirements** 
- **Decision**: Design webhook-friendly mutation responses for Slack/Teams integration
- **Rationale**: Allows external systems to easily consume recognition events

## User Workflows

### Primary Workflows

1. **Send Recognition**  
   `Employee -> Create Recognition -> Notify Recipient -> Update Analytics`

2. **View Recognitions**  
   `Employee -> Query Recognitions -> Apply Visibility Rules -> Return Filtered Results`

3. **Real-time Notifications**  
   `Recognition Created -> Subscription Trigger -> Push to Connected Clients`

4. **Analytics Dashboard**  
   `Manager/HR -> Query Analytics -> Aggregate Data -> Return Insights`

## Role-Based Access Control (RBAC)

### Roles Definition

- **EMPLOYEE**: Basic recognition sending/receiving
- **MANAGER**: Team analytics, view team member recognitions  
- **HR**: Organization-wide analytics, all recognition visibility
- **ADMIN**: Full system access, user management




## Development Setup

### Prerequisites
- Node.js 18+ with TypeScript
- PostgreSQL 13+ or MySQL 8+
- Redis 6+ for caching and real-time features
- Docker for local development environment

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd employee-recognition-api

# Install dependencies
npm install

# Set up environment variables
cp .env

# Start development services
docker-compose up -d postgres redis

# Run database migrations
npm run migrate

# Seed sample data
npm run seed

# Start the GraphQL server
npm run dev
```



## Core CRUD Operations:

createRecognition() - Create with validation and notifications
getRecognitions() - Get with permission filtering
getMyRecognitions() - Get sent/received by user
getRecognitionById() - Get single with access control
updateRecognition() - Update own recognitions only
deleteRecognition() - Soft delete own recognitions

## Validation Methods:

validateMessage() - Length, content, spam checking
validateVisibility() - Enum validation
validateRecipient() - Existence and self-check
validateRecognitionInput() - Complete input validation

## Helper Methods:

extractKeywords() - Smart keyword extraction with stopwords
insertRecognition() - Database insertion
sendNotifications() - Real-time pub/sub notifications
formatRecognitionResponse() - Response formatting
formatRecognitionRow() - Database row formatting

## Analytics Methods:

getRecognitionStats() - User statistics (sent/received counts)
getRecentActivity() - Recent activity for user


