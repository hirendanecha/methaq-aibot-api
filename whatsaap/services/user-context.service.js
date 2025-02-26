const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const { logger } = require('../../utils/logger');

class UserContextService {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    this.dbName = 'whatsapp_bot';
    this.collectionName = 'user_contexts';
    this.logger = logger;
    this.salt = process.env.HASHING_SALT;
    this.contextExpirationTime = 10800; // 3 hours in seconds

    this.init().catch(err => {
      this.logger.error('Failed to initialize MongoDB connection', err);
    });
  }

  async init() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      
      // Create TTL index for automatic document expiration
      await this.collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: this.contextExpirationTime });
      
      this.logger.info('MongoDB connection initialized');
    } catch (error) {
      this.logger.error('MongoDB connection error', error);
      throw error;
    }
  }

  hashPhoneNumber(phoneNumber) {
    return crypto
      .createHmac('sha256', this.salt)
      .update(phoneNumber)
      .digest('hex');
  }

  async saveToContext(context, contextType, userID) {
    try {
      const hashedUserID = this.hashPhoneNumber(userID);
      const value = {
        role: contextType,
        content: context
      };

      await this.collection.insertOne({
        userID: hashedUserID,
        context: value,
        createdAt: new Date()
      });

      return 'Context Saved!';
    } catch (error) {
      this.logger.error('Error Saving Context', error);
      return 'Error Saving Context';
    }
  }

  async saveAndFetchContext(context, contextType, userID) {
    try {
      const hashedUserID = this.hashPhoneNumber(userID);
      const value = {
        role: contextType,
        content: context
      };

      // Save new context
      await this.collection.insertOne({
        userID: hashedUserID,
        context: value,
        createdAt: new Date()
      });

      // Fetch conversation history
      const conversationContext = await this.collection
        .find({ userID: hashedUserID })
        .sort({ createdAt: 1 })
        .toArray();

      return conversationContext.map(doc => doc.context);
    } catch (error) {
      this.logger.error('Error Saving Context And Retrieving', error);
      return [];
    }
  }

  async getConversationHistory(userID) {
    try {
      const hashedUserID = this.hashPhoneNumber(userID);
      const conversation = await this.collection
        .find({ userID: hashedUserID })
        .sort({ createdAt: 1 })
        .toArray();

      return conversation.map(doc => doc.context);
    } catch (error) {
      this.logger.error('Error fetching conversation history', error);
      return [];
    }
  }

  // Cleanup method to be called when the application shuts down
  async close() {
    try {
      await this.client.close();
      this.logger.info('MongoDB connection closed');
    } catch (error) {
      this.logger.error('Error closing MongoDB connection', error);
    }
  }
}

module.exports = { UserContextService };