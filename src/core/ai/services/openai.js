const { OpenAI } = require('openai');
const logger = require('../../utils/logger');

/**
 * OpenAI Service
 */
class OpenAIService {
  constructor(config = {}) {
    this.config = config;
    this.client = null;
  }
  
  /**
   * Initialize OpenAI service
   */
  async initialize() {
    try {
      // Initialize OpenAI client
      this.client = new OpenAI({
        apiKey: this.config.apiKey || process.env.OPENAI_API_KEY
      });
      
      logger.info('OpenAI service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize OpenAI service:', error);
      throw error;
    }
  }
  
  /**
   * Generate text using OpenAI
   */
  async generateText(prompt, options = {}) {
    try {
      const {
        model = this.config.defaultModel || 'gpt-3.5-turbo',
        temperature = 0.7,
        maxTokens = 500,
        ...otherOptions
      } = options;
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        ...otherOptions
      });
      
      return {
        text: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      logger.error('Failed to generate text with OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings using OpenAI
   */
  async generateEmbeddings(texts, options = {}) {
    try {
      const {
        model = this.config.embeddingModel || 'text-embedding-ada-002',
        ...otherOptions
      } = options;
      
      // Ensure texts is an array
      const textArray = Array.isArray(texts) ? texts : [texts];
      
      const response = await this.client.embeddings.create({
        model,
        input: textArray,
        ...otherOptions
      });
      
      return {
        embeddings: response.data.map(item => item.embedding),
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      logger.error('Failed to generate embeddings with OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Classify text using OpenAI
   */
  async classifyText(text, options = {}) {
    try {
      const {
        categories,
        model = this.config.defaultModel || 'gpt-3.5-turbo',
        ...otherOptions
      } = options;
      
      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        throw new Error('Categories must be provided as a non-empty array');
      }
      
      const categoriesText = categories.join(', ');
      const prompt = `Classify the following text into one of these categories: ${categoriesText}.\n\nText: "${text}"\n\nCategory:`;
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 50,
        ...otherOptions
      });
      
      const category = response.choices[0].message.content.trim();
      
      return {
        category,
        confidence: 1.0, // OpenAI doesn't provide confidence scores directly
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      logger.error('Failed to classify text with OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Process image using OpenAI
   */
  async processImage(image, options = {}) {
    try {
      const {
        prompt = 'Describe this image in detail.',
        model = this.config.visionModel || 'gpt-4-vision-preview',
        maxTokens = 300,
        ...otherOptions
      } = options;
      
      // Handle different image input types
      let imageContent;
      if (typeof image === 'string') {
        // Assume it's a URL or base64 string
        if (image.startsWith('http')) {
          imageContent = { url: image };
        } else {
          imageContent = { base64: image };
        }
      } else if (Buffer.isBuffer(image)) {
        // Convert Buffer to base64
        imageContent = { base64: image.toString('base64') };
      } else {
        throw new Error('Image must be a URL, base64 string, or Buffer');
      }
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image', image_url: imageContent }
            ]
          }
        ],
        max_tokens: maxTokens,
        ...otherOptions
      });
      
      return {
        description: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      logger.error('Failed to process image with OpenAI:', error);
      throw error;
    }
  }
}

module.exports = {
  OpenAIService
}; 