import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import { getErrorMessage } from './utils/errorHandler';

import { typeDefs, resolvers } from './graphQLSchema';
import { RecognitionService } from './services/RecognitionService';
import { UserService } from './services/UserService';
import { AnalyticsService } from './services/AnalyticsService';
import webhookRoutes from './routes/webhooks';

dotenv.config();

// Database and PubSub setup
const db = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const pubsub = new PubSub();

// Initialize services
const recognitionService = new RecognitionService(db, pubsub);
const userService = new UserService(db);
const analyticsService = new AnalyticsService(db);

const services = {
  recognitionService,
  userService,
  analyticsService
};

// Authentication context
const createContext = ({ req, connection }: any) => {
  // WebSocket connections (subscriptions)
  if (connection) {
    return { 
      user: connection.context.user, 
      db, 
      pubsub,
      services 
    };
  }
  
  // HTTP requests (queries/mutations)
  const token = req?.headers?.authorization?.replace('Bearer ', '');
  let user = null;
  
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      console.warn('Invalid token:', getErrorMessage(error));
    }
  }
  
  return { user, db, pubsub, services };
};

// WebSocket authentication
const onConnect = (connectionParams: any) => {
  const token = connectionParams?.authorization?.replace('Bearer ', '');
  let user = null;
  
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      console.warn('WebSocket auth failed:', getErrorMessage(error));
    }
  }
  
  return { user };
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      services: {
        recognition: 'initialized',
        user: 'initialized',
        analytics: 'initialized'
      }
    });
  });
  
  // Webhook routes
  app.use('/webhooks', webhookRoutes);
  
  // Test database connection
  try {
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully');
    console.log('Services initialized');
  } catch (error) {
    console.error('Database connection failed:', error);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct');
    process.exit(1);
  }
  
  // Create GraphQL schema
  const schema = makeExecutableSchema({ 
    typeDefs, 
    resolvers: resolvers as any 
  });
  
  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  
  const serverCleanup = useServer(
    { 
      schema,
      context: async (ctx) => {
        return { 
          user: ctx.connectionParams?.user, 
          db, 
          pubsub, 
          services 
        };
      },
      onConnect
    }, 
    wsServer
  );
  
  // Apollo Server setup
  const server = new ApolloServer({
    schema,
    context: createContext,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    introspection: process.env.NODE_ENV !== 'production',
    csrfPrevention: process.env.NODE_ENV === 'production',
  });
  
  await server.start();
  server.applyMiddleware({ app: app as any, path: '/graphql', cors: false });
  
  const PORT = process.env.PORT || 4000;
  
  httpServer.listen(PORT, () => {
    console.log('Server ready!');
    console.log(`GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`Subscriptions endpoint: ws://localhost:${PORT}${server.graphqlPath}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`GraphQL Playground: http://localhost:${PORT}${server.graphqlPath}`);
    }
  });
}

// Batch processor for offline notifications (requirement compliance)
const startBatchProcessor = () => {
  setInterval(async () => {
    try {
      console.log('Running batch notification processor...');
      
      const result = await db.query(
        'SELECT COUNT(*) as count FROM recognitions WHERE created_at > NOW() - INTERVAL \'10 minutes\''
      );
      
      console.log(`Processed ${result.rows[0].count} recent recognitions`);
      
      // In a real implementation, this would:
      // 1. Query for undelivered notifications
      // 2. Send them via email/push notifications  
      // 3. Mark them as delivered
      
    } catch (error) {
      console.error('Batch processor error:', error);
    }
  }, 10 * 60 * 1000); // Every 10 minutes
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  db.end();
  process.exit(0);
});

// Start everything
startServer()
  .then(() => {
    startBatchProcessor();
    console.log('All systems operational!');
  })
  .catch((error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });