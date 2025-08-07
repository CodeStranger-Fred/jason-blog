import { Pool } from 'pg';
import { PubSub } from 'graphql-subscriptions';

export interface CreateRecognitionInput {
  recipientId: string;
  message: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'ANONYMOUS';
}

export interface RecognitionFilters {
  limit?: number;
  visibility?: string;
}

export class RecognitionService {
  constructor(
    private db: Pool,
    private pubsub: PubSub
  ) {}

  /**
   * Create a new recognition
   * @param userId ID of the sender
   * @param input Recognition details including recipient, message, visibility
   * @returns Formatted recognition response object
   */
  async createRecognition(userId: string, input: CreateRecognitionInput) {
    this.validateRecognitionInput(input, userId);
    const recipient = await this.validateRecipient(input.recipientId);
    const keywords = this.extractKeywords(input.message);
    const recognition = await this.insertRecognition(userId, input, keywords);
    await this.sendNotifications(recognition, recipient);
    return this.formatRecognitionResponse(recognition, userId, recipient);
  }

  /**
   * Fetch recognitions viewable by current user
   * @param userId Current user ID
   * @param filters Optional filters (limit, visibility)
   * @returns Array of formatted recognitions
   */
  async getRecognitions(userId: string, filters: RecognitionFilters = {}) {
    const { limit = 20, visibility } = filters;
    let query = `
      SELECT r.*, 
             s.name as sender_name, s.email as sender_email,
             rec.name as recipient_name, rec.email as recipient_email
      FROM recognitions r
      LEFT JOIN users s ON r.sender_id = s.id
      JOIN users rec ON r.recipient_id = rec.id
      WHERE (r.visibility = 'PUBLIC' OR r.sender_id = $1 OR r.recipient_id = $1)
    `;
    const params = [userId];
    if (visibility) {
      query += ' AND r.visibility = $2';
      params.push(visibility);
    }
    query += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit.toString());
    const result = await this.db.query(query, params);
    return result.rows.map(row => this.formatRecognitionRow(row));
  }

  /**
   * Get recognitions sent or received by user
   * @param userId Current user ID
   * @param type Type of recognitions: 'sent' | 'received'
   * @param limit Maximum number of results
   * @returns Array of formatted recognitions
   */
  async getMyRecognitions(userId: string, type: string = 'received', limit: number = 20) {
    const field = type === 'sent' ? 'sender_id' : 'recipient_id';
    const query = `
      SELECT r.*, 
             s.name as sender_name, s.email as sender_email,
             rec.name as recipient_name, rec.email as recipient_email
      FROM recognitions r
      LEFT JOIN users s ON r.sender_id = s.id
      JOIN users rec ON r.recipient_id = rec.id
      WHERE r.${field} = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `;
    const result = await this.db.query(query, [userId, limit]);
    return result.rows.map(row => this.formatRecognitionRow(row));
  }

  /**
   * Fetch a single recognition by ID if viewable by user
   * @param id Recognition ID
   * @param userId Current user ID
   * @returns Formatted recognition object
   */
  async getRecognitionById(id: string, userId: string) {
    const query = `
      SELECT r.*, 
             s.name as sender_name, s.email as sender_email,
             rec.name as recipient_name, rec.email as recipient_email
      FROM recognitions r
      LEFT JOIN users s ON r.sender_id = s.id
      JOIN users rec ON r.recipient_id = rec.id
      WHERE r.id = $1
        AND (r.visibility = 'PUBLIC' OR r.sender_id = $2 OR r.recipient_id = $2)
    `;
    const result = await this.db.query(query, [id, userId]);
    if (!result.rows[0]) {
      throw new Error('Recognition not found or access denied');
    }
    return this.formatRecognitionRow(result.rows[0]);
  }

  /**
   * Update a recognition (only by sender)
   * @param userId Current user ID
   * @param input Fields to update (must include recognition ID)
   * @returns Updated formatted recognition
   */
  async updateRecognition(userId: string, input: any) {
    const existingRecognition = await this.db.query(
      'SELECT * FROM recognitions WHERE id = $1',
      [input.id]
    );
    if (!existingRecognition.rows[0]) {
      throw new Error('Recognition not found');
    }
    const recognition = existingRecognition.rows[0];
    if (recognition.sender_id !== userId) {
      throw new Error('You can only update your own recognitions');
    }
    if (input.message) {
      this.validateMessage(input.message);
      input.keywords = JSON.stringify(this.extractKeywords(input.message));
    }
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    ['message', 'visibility', 'keywords'].forEach(field => {
      if (input[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(input[field]);
        paramIndex++;
      }
    });
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    const query = `
      UPDATE recognitions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(input.id);
    const result = await this.db.query(query, values);
    return this.formatRecognitionRow(result.rows[0]);
  }

  /**
   * Soft delete a recognition by marking visibility as DELETED
   * @param id Recognition ID
   * @param userId Current user ID
   * @returns true if deleted successfully
   */
  async deleteRecognition(id: string, userId: string) {
    const existingRecognition = await this.db.query(
      'SELECT * FROM recognitions WHERE id = $1',
      [id]
    );
    if (!existingRecognition.rows[0]) {
      throw new Error('Recognition not found');
    }
    const recognition = existingRecognition.rows[0];
    if (recognition.sender_id !== userId) {
      throw new Error('You can only delete your own recognitions');
    }
    await this.db.query(
      'UPDATE recognitions SET visibility = $1 WHERE id = $2',
      ['DELETED', id]
    );
    return true;
  }

  // Private helper methods
  /**
   * Validate overall recognition input including message, visibility, and recipient ID
   * @param input Recognition input object
   * @param userId ID of the sender (used to check self-recognition)
   */
  private validateRecognitionInput(input: CreateRecognitionInput, userId: string): void {
    this.validateMessage(input.message);
    this.validateVisibility(input.visibility);
    this.validateRecipientSenderID(input.recipientId, userId);
  }

  /**
   * Validate recognition message content
   * @param message The message to validate
   * @throws Error if message is empty, too long, or contains blocked words
   */
  private validateMessage(message: string): void {
    if (!message || message.trim().length === 0) {
      throw new Error('Message is required');
    }
    if (message.length > 500) {
      throw new Error('Message cannot exceed 500 characters');
    }
    if (message.toLowerCase().includes('spam')) {
      throw new Error('Message contains inappropriate content');
    }
    const blockedWords = ['offensive', 'inappropriate', 'hate'];
    const lowerMessage = message.toLowerCase();
    const hasBlockedWord = blockedWords.some(word => lowerMessage.includes(word));
    if (hasBlockedWord) {
      throw new Error('Message contains inappropriate content');
    }
  }

  /**
   * Validate the visibility field
   * @param visibility Visibility value to validate
   * @throws Error if the visibility is not one of the allowed options
   */
  private validateVisibility(visibility: string): void {
    const validVisibilities = ['PUBLIC', 'PRIVATE', 'ANONYMOUS'];
    if (!validVisibilities.includes(visibility)) {
      throw new Error('Invalid visibility setting. Must be PUBLIC, PRIVATE, or ANONYMOUS');
    }
  }

  /**
   * Ensure recipient ID is not the same as sender ID
   * @param recipientId Target user ID to receive the recognition
   * @param senderId User ID of the sender
   */
  private validateRecipientSenderID(recipientId: string, senderId: string): void {
    if (!recipientId) {
      throw new Error('Recipient ID is required');
    }
    if (recipientId === senderId) {
      throw new Error('Cannot recognize yourself');
    }
  }

  /**
   * Check that the recipient user exists in the database
   * @param recipientId ID of the recipient user
   * @returns User object from the DB
   */
  private async validateRecipient(recipientId: string) {
    const result = await this.db.query(
      'SELECT id, name, email, team_id FROM users WHERE id = $1',
      [recipientId]
    );
    if (!result.rows[0]) {
      throw new Error('Recipient not found');
    }
    return result.rows[0];
  }

  /**
   * Extract up to 5 keywords from a message (ignoring stop words)
   * @param message Raw message text
   * @returns Array of extracted keywords
   */
  private extractKeywords(message: string): string[] {
    if (!message) return [];
    const words = message.toLowerCase().split(/\s+/);
    const stopWords = ['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'were', 'said', 'each', 'which', 'their', 'time', 'would'];
    return words
      .filter(word => 
        word.length > 3 && 
        !stopWords.includes(word) &&
        /^[a-zA-Z]+$/.test(word)
      )
      .slice(0, 5);
  }

  /**
   * Insert a new recognition record into the database
   * @param userId ID of the sender
   * @param input Recognition input values
   * @param keywords Extracted keywords for search and analytics
   * @returns Inserted recognition record
   */
  private async insertRecognition(
    userId: string, 
    input: CreateRecognitionInput, 
    keywords: string[]
  ) {
    const query = `
      INSERT INTO recognitions (sender_id, recipient_id, message, visibility, keywords, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const values = [
      input.visibility === 'ANONYMOUS' ? null : userId,
      input.recipientId,
      input.message.trim(),
      input.visibility,
      JSON.stringify(keywords)
    ];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Publish recognition-related GraphQL events
   * @param recognition Newly created recognition
   * @param recipient Recipient user details
   */
  private async sendNotifications(recognition: any, recipient: any): Promise<void> {
    try {
      const recognitionData = {
        id: recognition.id,
        message: recognition.message,
        visibility: recognition.visibility,
        keywords: JSON.parse(recognition.keywords),
        createdAt: recognition.created_at,
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email
        }
      };
      await this.pubsub.publish('RECOGNITION_RECEIVED', {
        recognitionReceived: recognitionData
      });
      if (recognition.visibility === 'PUBLIC') {
        await this.pubsub.publish('RECOGNITION_CREATED', {
          recognitionCreated: recognitionData
        });
      }
      console.log(`Notifications sent for recognition ${recognition.id}`);
    } catch (error) {
      console.error('Notification sending failed:', error);
    }
  }

  /**
   * Transform raw recognition record into API response format
   * @param recognition DB record
   * @param senderId Sender ID (current user)
   * @param recipient Recipient user object
   * @returns Formatted response object
   */
  private formatRecognitionResponse(recognition: any, senderId: string, recipient: any) {
    return {
      id: recognition.id,
      message: recognition.message,
      visibility: recognition.visibility,
      keywords: this.parseKeywords(recognition.keywords),
      createdAt: recognition.created_at,
      sender: recognition.visibility === 'ANONYMOUS' ? null : {
        id: senderId,
        name: 'Current User',
        email: 'current@company.com'
      },
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email
      }
    };
  }

  /**
   * Parse keyword field from DB string/array into string array
   * @param input Keyword string or array
   * @returns Parsed keyword array
   */
  private parseKeywords(input: string | string[]): string[] {
    if (Array.isArray(input)) return input;
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return input.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  /**
   * Format a DB recognition row into API-friendly object
   * @param row Raw database row
   * @returns Formatted recognition object
   */
  private formatRecognitionRow(row: any) {
    return {
      id: row.id,
      message: row.message,
      visibility: row.visibility,
      keywords: JSON.parse(row.keywords || '[]'),
      createdAt: row.created_at,
      sender: row.sender_id ? {
        id: row.sender_id,
        name: row.sender_name,
        email: row.sender_email
      } : null,
      recipient: {
        id: row.recipient_id,
        name: row.recipient_name,
        email: row.recipient_email
      }
    };
  }

  // Utility methods for analytics and reporting
  async getRecognitionStats(userId: string) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE sender_id = $1) as sent_count,
        COUNT(*) FILTER (WHERE recipient_id = $1) as received_count,
        COUNT(*) FILTER (WHERE sender_id = $1 AND visibility = 'PUBLIC') as public_sent,
        COUNT(*) FILTER (WHERE recipient_id = $1 AND visibility = 'PUBLIC') as public_received
      FROM recognitions
      WHERE (sender_id = $1 OR recipient_id = $1) AND visibility != 'DELETED'
    `;
    
    const result = await this.db.query(query, [userId]);
    const stats = result.rows[0];
    
    return {
      sent: parseInt(stats.sent_count || '0'),
      received: parseInt(stats.received_count || '0'),
      publicSent: parseInt(stats.public_sent || '0'),
      publicReceived: parseInt(stats.public_received || '0')
    };
  }

  async getRecentActivity(userId: string, days: number = 30) {
    const query = `
      SELECT r.*, s.name as sender_name, rec.name as recipient_name
      FROM recognitions r
      LEFT JOIN users s ON r.sender_id = s.id
      JOIN users rec ON r.recipient_id = rec.id
      WHERE (r.sender_id = $1 OR r.recipient_id = $1)
        AND r.created_at >= NOW() - INTERVAL '${days} days'
        AND r.visibility != 'DELETED'
      ORDER BY r.created_at DESC
      LIMIT 50
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows.map(row => this.formatRecognitionRow(row));
  }
}