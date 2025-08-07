import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime

  enum UserRole {
    EMPLOYEE
    MANAGER
    HR
    ADMIN
  }

  enum Visibility {
    PUBLIC
    PRIVATE
    ANONYMOUS
  }

  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    team: Team
    createdAt: DateTime!
  }

  type Team {
    id: ID!
    name: String!
    description: String
    members: [User!]!
    createdAt: DateTime!
  }

  type Recognition {
    id: ID!
    message: String!
    visibility: Visibility!
    sender: User
    recipient: User!
    keywords: [String!]!
    createdAt: DateTime!
  }

  type TeamStats {
    teamId: ID!
    totalCount: Int!
    publicCount: Int!
    privateCount: Int!
    anonymousCount: Int!
    topKeywords: [String!]!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input CreateRecognitionInput {
    recipientId: ID!
    message: String!
    visibility: Visibility!
  }

  type Query {
    # Authentication
    me: User
    
    # Users
    user(id: ID!): User
    users(limit: Int = 20): [User!]!
    
    # Recognitions
    recognitions(limit: Int = 20, visibility: Visibility): [Recognition!]!
    myRecognitions(type: String, limit: Int = 20): [Recognition!]!
    recognition(id: ID!): Recognition
    
    # Analytics (role-restricted)
    teamStats(teamId: ID!): TeamStats
  }

  type Mutation {
    # Authentication
    login(email: String!): AuthPayload!
    
    # Recognitions
    createRecognition(input: CreateRecognitionInput!): Recognition!
  }

  type Subscription {
    # Real-time notifications
    recognitionReceived(userId: ID!): Recognition!
    recognitionCreated: Recognition!
  }
`;

export const resolvers = {
  Query: {
    // Authentication
    me: async (_: any, __: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.userService.getCurrentUser(user.id);
    },
    
    // Users
    user: async (_: any, { id }: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.userService.getUserById(id);
    },
    
    users: async (_: any, { limit }: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.userService.getUsers(limit);
    },
    
    // Recognitions
    recognitions: async (_: any, args: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.recognitionService.getRecognitions(user.id, args);
    },
    
    myRecognitions: async (_: any, args: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.recognitionService.getMyRecognitions(user.id, args.type, args.limit);
    },
    
    recognition: async (_: any, { id }: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.recognitionService.getRecognitionById(id, user.id);
    },
    
    // Analytics
    teamStats: async (_: any, { teamId }: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.analyticsService.getTeamStats(teamId, user.role);
    }
  },
  
  Mutation: {
    // Authentication
    login: async (_: any, { email }: any, { services }: any) => {
      return services.userService.login(email);
    },
    
    // Recognitions
    createRecognition: async (_: any, { input }: any, { user, services }: any) => {
      if (!user) throw new Error('Authentication required');
      return services.recognitionService.createRecognition(user.id, input);
    }
  },
  
  Subscription: {
    recognitionReceived: {
      subscribe: (_: any, { userId }: any, { pubsub }: any) => {
        console.log(`User ${userId} subscribed to recognition notifications`);
        return pubsub.asyncIterator(['RECOGNITION_RECEIVED']);
      },
      resolve: (payload: any, { userId }: any) => {
        // Only send to the intended recipient
        if (payload.recognitionReceived.recipient.id === userId) {
          return payload.recognitionReceived;
        }
        return null;
      }
    },
    
    recognitionCreated: {
      subscribe: (_: any, __: any, { pubsub }: any) => {
        console.log('Client subscribed to new recognitions');
        return pubsub.asyncIterator(['RECOGNITION_CREATED']);
      }
    }
  },
  
  // Field resolvers
  User: {
    team: async (parent: any, _: any, { services }: any) => {
      if (!parent.teamId) return null;
      return services.userService.getUserTeam(parent.teamId);
    }
  },
  
  Team: {
    members: async (parent: any, _: any, { services }: any) => {
      return services.userService.getTeamMembers(parent.id);
    }
  }
};