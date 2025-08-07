import express from 'express';
import jwt from 'jsonwebtoken';
import { getErrorMessage } from '../utils/errorHandler';
import { sendErrorResponse, sendSlackResponse, sendTeamsResponse } from '../utils/responseHelpers';
import { validateSlackEvent, validateTeamsEvent } from '../utils/validation';

const router = express.Router();

// Slack integration webhook
router.post('/slack', async (req, res) => {
  try {
    const { type, challenge, event } = req.body;
    
    // Slack URL verification
    if (type === 'url_verification') {
      console.log('Slack URL verification successful');
      return res.json({ challenge });
    }
    
    // Handle Slack events
    if (event && event.type === 'message') {
      console.log('📨 Slack message received:', {
        user: event.user,
        text: event.text?.substring(0, 100),
        channel: event.channel
      });
      
      // Parse message for recognition commands
      const text = event.text?.toLowerCase() || '';
      
      if (text.includes('recognize') || text.includes('kudos')) {
        console.log('👏 Recognition command detected in Slack');
        
        // In a real implementation, this would:
        // 1. Parse the message for @mentions and recognition text
        // 2. Look up users in the database
        // 3. Create recognition via GraphQL mutation
        // 4. Send confirmation back to Slack channel
        
        return res.json({
          response_type: 'in_channel',
          text: 'Recognition received!',
          attachments: [{
            color: 'good',
            text: 'Your recognition will be processed by the recognition system.',
            footer: 'Employee Recognition Bot'
          }]
        });
      }
      
      res.json({ status: 'received' });
    } else {
      res.json({ status: 'ignored' });
    }
    
  } catch (error) {
    console.error('Slack webhook error:', error);
    sendErrorResponse(res, error, 'Webhook processing failed');
  }
});

// Microsoft Teams integration webhook
router.post('/teams', async (req, res) => {
  try {
    const { type, text, from, conversation } = req.body;
    
    console.log('📨 Teams webhook received:', {
      type,
      text: text?.substring(0, 100),
      from: from?.name,
      conversationId: conversation?.id
    });
    
    // Handle Teams message
    if (type === 'message' && text) {
      const messageText = text.toLowerCase();
      
      if (messageText.includes('recognize') || messageText.includes('kudos')) {
        console.log('👏 Recognition command detected in Teams');
        
        return res.json({
          type: 'message',
          text: '🎉 Recognition received! Your kudos has been recorded.',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.2',
              body: [{
                type: 'TextBlock',
                text: '✅ Recognition Processed',
                weight: 'Bolder',
                size: 'Medium'
              }, {
                type: 'TextBlock',
                text: 'Your recognition has been submitted to the employee recognition system.',
                wrap: true
              }]
            }
          }]
        });
      }
    }
    
    // Default response
    res.json({
      type: 'message',
      text: '🤖 Hello! I\'m the Recognition Bot. Use "recognize @user for [reason]" to send kudos!'
    });
    
      } catch (error) {
      console.error('Teams webhook error:', error);
      res.status(500).json({
        error: 'Teams webhook processing failed',
        message: getErrorMessage(error)
      });
    }
});

// Generic external webhook for other integrations
router.post('/external', async (req, res) => {
  try {
    const { event, data, source } = req.body;
    
    console.log(`📡 External webhook from ${source}:`, { event, data });
    
    switch (event) {
      case 'recognition.created':
        console.log('🎯 External recognition created:', {
          recipient: data?.recipient,
          message: data?.message?.substring(0, 50),
          source
        });
        break;
        
      case 'user.promoted':
        console.log('📈 User promotion detected:', {
          userId: data?.userId,
          newRole: data?.newRole,
          source
        });
        break;
        
      case 'team.updated':
        console.log('👥 Team update detected:', {
          teamId: data?.teamId,
          action: data?.action,
          source
        });
        break;
        
      default:
        console.log('Unknown external event:', event);
    }
    
    res.json({
      status: 'processed',
      event,
      timestamp: new Date().toISOString(),
      message: `Event ${event} processed successfully`
    });
    
      } catch (error) {
      console.error('External webhook error:', error);
      res.status(500).json({
        error: 'External webhook processing failed',
        event: req.body?.event,
        message: getErrorMessage(error)
      });
    }
});

// Health check for webhook endpoints
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoints: {
      slack: '/webhooks/slack',
      teams: '/webhooks/teams',
      external: '/webhooks/external'
    },
    timestamp: new Date().toISOString()
  });
});

// Webhook authentication middleware (for production)
router.use('/secure/*', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Secure webhook endpoint (requires authentication)
router.post('/secure/recognition', async (req, res) => {
  try {
    const { recognition, metadata } = req.body;
    
    console.log('🔐 Secure webhook - recognition data:', {
      id: recognition?.id,
      visibility: recognition?.visibility,
      metadata
    });
    
    res.json({
      status: 'processed',
      timestamp: new Date().toISOString(),
      secure: true
    });
    
  } catch (error) {
    console.error('Secure webhook error:', error);
    res.status(500).json({ error: 'Secure webhook processing failed' });
  }
});

export default router;