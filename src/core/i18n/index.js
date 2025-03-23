const i18next = require('i18next');
const i18nextFsBackend = require('i18next-fs-backend');
const i18nextHttpMiddleware = require('i18next-http-middleware');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Internationalization Manager
 */
class I18nManager {
  constructor(config = {}) {
    this.config = config;
    this.i18next = i18next;
    this.middleware = null;
  }
  
  /**
   * Initialize internationalization
   */
  async initialize() {
    try {
      // Ensure locales directory exists
      const localesDir = path.join(process.cwd(), 'locales');
      if (!fs.existsSync(localesDir)) {
        fs.mkdirSync(localesDir, { recursive: true });
        
        // Create sample locale files
        this.createSampleLocales(localesDir);
      }
      
      // Initialize i18next
      await this.i18next
        .use(i18nextFsBackend)
        .use(i18nextHttpMiddleware.LanguageDetector)
        .init({
          backend: {
            loadPath: path.join(localesDir, '{{lng}}/{{ns}}.json')
          },
          fallbackLng: this.config.fallbackLanguage || 'en',
          preload: this.config.preloadLanguages || ['en'],
          supportedLngs: this.config.supportedLanguages,
          ns: this.config.namespaces || ['common', 'errors', 'validation'],
          defaultNS: 'common',
          detection: {
            order: ['querystring', 'cookie', 'header'],
            lookupQuerystring: 'lang',
            lookupCookie: 'i18next',
            lookupHeader: 'accept-language',
            caches: ['cookie']
          },
          ...this.config.i18nextOptions
        });
      
      // Create middleware
      this.middleware = i18nextHttpMiddleware.handle(this.i18next);
      
      logger.info('Internationalization initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize internationalization:', error);
      throw error;
    }
  }
  
  /**
   * Create sample locale files
   */
  createSampleLocales(localesDir) {
    try {
      // Create English locale
      const enDir = path.join(localesDir, 'en');
      if (!fs.existsSync(enDir)) {
        fs.mkdirSync(enDir, { recursive: true });
      }
      
      // Common translations
      fs.writeFileSync(
        path.join(enDir, 'common.json'),
        JSON.stringify({
          welcome: 'Welcome to Universal Backend Engine',
          loading: 'Loading...',
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          edit: 'Edit',
          create: 'Create',
          search: 'Search',
          filter: 'Filter',
          actions: 'Actions'
        }, null, 2)
      );
      
      // Error translations
      fs.writeFileSync(
        path.join(enDir, 'errors.json'),
        JSON.stringify({
          notFound: 'Not found',
          serverError: 'Server error',
          unauthorized: 'Unauthorized',
          forbidden: 'Forbidden',
          badRequest: 'Bad request',
          validationFailed: 'Validation failed'
        }, null, 2)
      );
      
      // Validation translations
      fs.writeFileSync(
        path.join(enDir, 'validation.json'),
        JSON.stringify({
          required: '{{field}} is required',
          minLength: '{{field}} must be at least {{min}} characters',
          maxLength: '{{field}} must be at most {{max}} characters',
          email: 'Invalid email address',
          url: 'Invalid URL',
          numeric: '{{field}} must be a number',
          integer: '{{field}} must be an integer',
          boolean: '{{field}} must be a boolean',
          date: 'Invalid date'
        }, null, 2)
      );
      
      logger.info('Created sample locale files');
    } catch (error) {
      logger.error('Failed to create sample locale files:', error);
    }
  }
  
  /**
   * Get Express middleware
   */
  getMiddleware() {
    return this.middleware;
  }
  
  /**
   * Translate text
   */
  translate(key, options = {}) {
    return this.i18next.t(key, options);
  }
  
  /**
   * Change language
   */
  changeLanguage(lng) {
    return this.i18next.changeLanguage(lng);
  }
  
  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.i18next.language;
  }
  
  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.i18next.options.supportedLngs;
  }
  
  /**
   * Format date according to locale
   */
  formatDate(date, options = {}) {
    const lng = options.lng || this.getCurrentLanguage();
    
    return new Intl.DateTimeFormat(lng, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(date);
  }
  
  /**
   * Format number according to locale
   */
  formatNumber(number, options = {}) {
    const lng = options.lng || this.getCurrentLanguage();
    
    return new Intl.NumberFormat(lng, options).format(number);
  }
  
  /**
   * Format currency according to locale
   */
  formatCurrency(amount, currency = 'USD', options = {}) {
    const lng = options.lng || this.getCurrentLanguage();
    
    return new Intl.NumberFormat(lng, {
      style: 'currency',
      currency,
      ...options
    }).format(amount);
  }
}

module.exports = I18nManager; 