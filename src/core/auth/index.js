const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: OAuth2Strategy } = require('passport-oauth2');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Setup authentication middleware and strategies
 */
function setupAuthentication(app, config) {
  // Initialize passport
  app.use(passport.initialize());
  
  // Setup JWT strategy if enabled
  if (config.jwt && config.jwt.enabled) {
    setupJwtStrategy(config.jwt);
  }
  
  // Setup OAuth2 strategies if enabled
  if (config.oauth2 && config.oauth2.enabled) {
    setupOAuth2Strategies(config.oauth2);
  }
  
  // Setup API Key authentication if enabled
  if (config.apiKey && config.apiKey.enabled) {
    setupApiKeyStrategy(config.apiKey);
  }
  
  // Setup authentication routes
  setupAuthRoutes(app, config);
  
  logger.info('Authentication system initialized');
}

/**
 * Setup JWT authentication strategy
 */
function setupJwtStrategy(config) {
  const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.secret,
    issuer: config.issuer,
    audience: config.audience
  };
  
  passport.use(new JwtStrategy(options, async (payload, done) => {
    try {
      // In a real implementation, you would validate the user from the database
      // For now, we'll just check if the user ID exists in the payload
      if (payload.sub) {
        return done(null, { id: payload.sub, roles: payload.roles || [] });
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  }));
  
  logger.debug('JWT authentication strategy configured');
}

/**
 * Setup OAuth2 authentication strategies
 */
function setupOAuth2Strategies(config) {
  // Setup Google OAuth2 if configured
  if (config.providers.google) {
    const googleConfig = config.providers.google;
    
    passport.use('google', new OAuth2Strategy({
      authorizationURL: 'https://accounts.google.com/o/oauth2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      clientID: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
      callbackURL: googleConfig.callbackURL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // In a real implementation, you would find or create the user in your database
        const user = { id: profile.id, provider: 'google' };
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }));
    
    logger.debug('Google OAuth2 authentication strategy configured');
  }
  
  // Add other OAuth2 providers here as needed
}

/**
 * Setup API Key authentication strategy
 */
function setupApiKeyStrategy(config) {
  passport.use('api-key', new passport.Strategy({
    passReqToCallback: true
  }, async (req, done) => {
    try {
      const apiKey = req.headers[config.header.toLowerCase()];
      
      if (!apiKey) {
        return done(null, false);
      }
      
      // In a real implementation, you would validate the API key against your database
      // For now, we'll just check if it's not empty
      if (apiKey) {
        return done(null, { id: 'api-client', roles: ['api'] });
      }
      
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  }));
  
  logger.debug('API Key authentication strategy configured');
}

/**
 * Setup authentication routes
 */
function setupAuthRoutes(app, config) {
  const router = require('express').Router();
  
  // JWT login route
  if (config.jwt && config.jwt.enabled) {
    router.post('/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        // In a real implementation, you would validate the credentials against your database
        // For demonstration purposes, we'll accept any non-empty username and password
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
          { 
            sub: username, 
            roles: ['user'] 
          }, 
          config.jwt.secret, 
          { 
            expiresIn: config.jwt.expiresIn 
          }
        );
        
        return res.json({ token });
      } catch (error) {
        logger.error('Login error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
      }
    });
    
    // JWT token refresh route
    router.post('/refresh', passport.authenticate('jwt', { session: false }), (req, res) => {
      try {
        // Generate a new token
        const token = jwt.sign(
          { 
            sub: req.user.id, 
            roles: req.user.roles 
          }, 
          config.jwt.secret, 
          { 
            expiresIn: config.jwt.expiresIn 
          }
        );
        
        return res.json({ token });
      } catch (error) {
        logger.error('Token refresh error:', error);
        return res.status(500).json({ error: 'Token refresh failed' });
      }
    });
  }
  
  // OAuth2 routes
  if (config.oauth2 && config.oauth2.enabled) {
    // Google OAuth2 routes
    if (config.oauth2.providers.google) {
      router.get('/google', passport.authenticate('google', { 
        scope: ['profile', 'email'] 
      }));
      
      router.get('/google/callback', passport.authenticate('google', { 
        failureRedirect: '/login' 
      }), (req, res) => {
        // In a real implementation, you would generate a JWT token and redirect to the frontend
        res.redirect('/');
      });
    }
    
    // Add other OAuth2 provider routes here as needed
  }
  
  // Mount the authentication routes
  app.use('/auth', router);
}

/**
 * Middleware to check if the user is authenticated
 */
function isAuthenticated(req, res, next) {
  passport.authenticate(['jwt', 'api-key'], { session: false }, (err, user) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    req.user = user;
    return next();
  })(req, res, next);
}

/**
 * Middleware to check if the user has the required roles
 */
function hasRoles(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    return next();
  };
}

module.exports = {
  setupAuthentication,
  isAuthenticated,
  hasRoles
}; 