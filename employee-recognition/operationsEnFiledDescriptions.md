# Operations & Field Descriptions

## Types

### User
- `id` - Unique identifier
- `email` - Login email address
- `name` - Display name
- `role` - Permission level (EMPLOYEE/MANAGER/HR/ADMIN)
- `team` - Team membership (optional)
- `createdAt` - Account creation date

### Team
- `id` - Unique identifier
- `name` - Team display name
- `description` - Optional team description
- `members` - List of team users
- `createdAt` - Team creation date

### Recognition
- `id` - Unique identifier
- `message` - Recognition text (1-500 chars)
- `visibility` - Who can see it (PUBLIC/PRIVATE/ANONYMOUS)
- `sender` - Who sent it (null if anonymous)
- `recipient` - Who received it
- `keywords` - Auto-extracted words for analytics
- `createdAt` - When it was sent

### TeamStats
- `teamId` - Team identifier
- `totalCount` - Total recognitions received by team
- `publicCount` - Public recognitions count
- `privateCount` - Private recognitions count  
- `anonymousCount` - Anonymous recognitions count
- `topKeywords` - Most common keywords used

## Queries

### `me`
Returns current user's profile

### `user(id: ID!)`
Returns user profile by ID

### `users(limit: Int)`
Returns list of company users

### `recognitions(limit: Int, visibility: Visibility)`
Returns recognitions user can see

### `myRecognitions(type: String, limit: Int)`
Returns user's sent/received recognitions

### `recognition(id: ID!)`
Returns specific recognition by ID

### `teamStats(teamId: ID!)`
Returns team analytics (managers+ only)

## Mutations

### `login(email: String!)`
Authenticate and get JWT token

### `createRecognition(input: CreateRecognitionInput!)`
Send recognition to coworker

## Subscriptions

### `recognitionReceived(userId: ID!)`
Real-time notifications for user

### `recognitionCreated`
Real-time feed of new public recognitions