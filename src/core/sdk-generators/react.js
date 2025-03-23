const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generate React SDK for the API
 */
async function generateReactSDK(config, outputDir) {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate API client
    const apiClientCode = generateApiClient(config);
    fs.writeFileSync(path.join(outputDir, 'api-client.js'), apiClientCode);
    
    // Generate hooks for REST API
    if (config.api.rest.enabled) {
      const restHooksCode = generateRestHooks(config);
      fs.writeFileSync(path.join(outputDir, 'rest-hooks.js'), restHooksCode);
    }
    
    // Generate hooks for GraphQL API
    if (config.api.graphql.enabled) {
      const graphqlHooksCode = generateGraphQLHooks(config);
      fs.writeFileSync(path.join(outputDir, 'graphql-hooks.js'), graphqlHooksCode);
    }
    
    // Generate hooks for WebSocket API
    if (config.api.websocket.enabled) {
      const websocketHooksCode = generateWebSocketHooks(config);
      fs.writeFileSync(path.join(outputDir, 'websocket-hooks.js'), websocketHooksCode);
    }
    
    // Generate index file
    const indexCode = generateIndexFile(config);
    fs.writeFileSync(path.join(outputDir, 'index.js'), indexCode);
    
    logger.info(`React SDK generated successfully in ${outputDir}`);
    return true;
  } catch (error) {
    logger.error('Failed to generate React SDK:', error);
    throw error;
  }
}

/**
 * Generate API client code
 */
function generateApiClient(config) {
  return `
import axios from 'axios';

/**
 * API Client for Universal Backend Engine
 */
class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '${config.api.rest.basePath}/${config.api.rest.version}';
    this.timeout = options.timeout || 10000;
    this.token = options.token || null;
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = \`Bearer \${this.token}\`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  
  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
  }
  
  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
  }
  
  /**
   * Get all resources
   */
  async getAll(resource) {
    try {
      const response = await this.client.get(\`/\${resource}\`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }
  
  /**
   * Get resource by ID
   */
  async getById(resource, id) {
    try {
      const response = await this.client.get(\`/\${resource}/\${id}\`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }
  
  /**
   * Create a new resource
   */
  async create(resource, data) {
    try {
      const response = await this.client.post(\`/\${resource}\`, data);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }
  
  /**
   * Update a resource
   */
  async update(resource, id, data) {
    try {
      const response = await this.client.put(\`/\${resource}/\${id}\`, data);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }
  
  /**
   * Delete a resource
   */
  async delete(resource, id) {
    try {
      const response = await this.client.delete(\`/\${resource}/\${id}\`);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }
  
  /**
   * Custom request
   */
  async request(method, url, data = null, config = {}) {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        ...config
      });
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }
  
  /**
   * Handle API errors
   */
  _handleError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      return {
        status,
        message: data.error || 'An error occurred',
        data
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        status: 0,
        message: 'No response from server',
        data: null
      };
    } else {
      // Something happened in setting up the request that triggered an Error
      return {
        status: 0,
        message: error.message,
        data: null
      };
    }
  }
}

export default ApiClient;
`;
}

/**
 * Generate REST hooks code
 */
function generateRestHooks(config) {
  return `
import { useState, useEffect, useCallback } from 'react';
import ApiClient from './api-client';

// Create a default API client instance
const defaultClient = new ApiClient();

/**
 * Hook for fetching data from the API
 */
export function useFetch(resource, id = null, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const client = options.client || defaultClient;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let result;
        
        if (id) {
          result = await client.getById(resource, id);
        } else {
          result = await client.getAll(resource);
        }
        
        setData(result);
        setError(null);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [resource, id, client]);
  
  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      let result;
      
      if (id) {
        result = await client.getById(resource, id);
      } else {
        result = await client.getAll(resource);
      }
      
      setData(result);
      setError(null);
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [resource, id, client]);
  
  return { data, loading, error, refetch };
}

/**
 * Hook for creating a resource
 */
export function useCreate(resource, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const client = options.client || defaultClient;
  
  const create = useCallback(async (data) => {
    try {
      setLoading(true);
      const result = await client.create(resource, data);
      setError(null);
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [resource, client]);
  
  return { create, loading, error };
}

/**
 * Hook for updating a resource
 */
export function useUpdate(resource, id, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const client = options.client || defaultClient;
  
  const update = useCallback(async (data) => {
    try {
      setLoading(true);
      const result = await client.update(resource, id, data);
      setError(null);
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [resource, id, client]);
  
  return { update, loading, error };
}

/**
 * Hook for deleting a resource
 */
export function useDelete(resource, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const client = options.client || defaultClient;
  
  const remove = useCallback(async (id) => {
    try {
      setLoading(true);
      const result = await client.delete(resource, id);
      setError(null);
      return result;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [resource, client]);
  
  return { remove, loading, error };
}

/**
 * Hook for authentication
 */
export function useAuth(options = {}) {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const client = options.client || defaultClient;
  
  // Set token in client and localStorage
  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      const response = await client.request('post', '/auth/login', { username, password });
      const { token } = response;
      
      localStorage.setItem('auth_token', token);
      client.setToken(token);
      setToken(token);
      
      // Fetch user data
      const userData = await client.request('get', '/user/me');
      setUser(userData);
      
      setError(null);
      return userData;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  // Clear token from client and localStorage
  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    client.clearToken();
    setToken(null);
    setUser(null);
  }, [client]);
  
  // Initialize client with token from localStorage
  useEffect(() => {
    if (token) {
      client.setToken(token);
      
      // Fetch user data
      const fetchUser = async () => {
        try {
          const userData = await client.request('get', '/user/me');
          setUser(userData);
        } catch (error) {
          // Token might be invalid or expired
          logout();
        }
      };
      
      fetchUser();
    }
  }, [token, client, logout]);
  
  return { token, user, login, logout, loading, error };
}
`;
}

/**
 * Generate GraphQL hooks code
 */
function generateGraphQLHooks(config) {
  return `
import { useState, useCallback } from 'react';

/**
 * Hook for executing GraphQL queries
 */
export function useQuery(query, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (variables = {}) => {
    try {
      setLoading(true);
      
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.token ? { 'Authorization': \`Bearer \${options.token}\` } : {})
        },
        body: JSON.stringify({
          query,
          variables
        })
      });
      
      const result = await response.json();
      
      if (result.errors) {
        throw result.errors;
      }
      
      setData(result.data);
      setError(null);
      return result.data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [query, options.token]);
  
  return { execute, data, loading, error };
}

/**
 * Hook for executing GraphQL mutations
 */
export function useMutation(mutation, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async (variables = {}) => {
    try {
      setLoading(true);
      
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.token ? { 'Authorization': \`Bearer \${options.token}\` } : {})
        },
        body: JSON.stringify({
          query: mutation,
          variables
        })
      });
      
      const result = await response.json();
      
      if (result.errors) {
        throw result.errors;
      }
      
      setData(result.data);
      setError(null);
      return result.data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutation, options.token]);
  
  return { execute, data, loading, error };
}
`;
}

/**
 * Generate WebSocket hooks code
 */
function generateWebSocketHooks(config) {
  return `
import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

/**
 * Hook for WebSocket connection
 */
export function useWebSocket(options = {}) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  
  useEffect(() => {
    // Create socket connection
    const socket = io(options.url || '/', {
      path: options.path || '/ws',
      auth: {
        token: options.token
      }
    });
    
    // Set up event listeners
    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });
    
    socket.on('disconnect', () => {
      setConnected(false);
    });
    
    socket.on('error', (err) => {
      setError(err);
    });
    
    // Store socket reference
    socketRef.current = socket;
    
    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, [options.url, options.path, options.token]);
  
  // Function to emit events
  const emit = useCallback((event, data, callback) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data, callback);
    }
  }, []);
  
  // Function to subscribe to events
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      
      // Return unsubscribe function
      return () => {
        socketRef.current.off(event, callback);
      };
    }
    return () => {};
  }, []);
  
  return { connected, error, emit, on, socket: socketRef.current };
}

/**
 * Hook for real-time data subscription
 */
export function useSubscription(event, options = {}) {
  const [data, setData] = useState(null);
  const { connected, on } = useWebSocket(options);
  
  useEffect(() => {
    if (connected) {
      // Subscribe to the event
      const unsubscribe = on(event, (newData) => {
        setData(newData);
        
        // Call the callback if provided
        if (options.onData) {
          options.onData(newData);
        }
      });
      
      // Clean up subscription
      return unsubscribe;
    }
  }, [connected, event, on, options.onData]);
  
  return { data, connected };
}
`;
}

/**
 * Generate index file code
 */
function generateIndexFile(config) {
  const imports = [];
  const exports = [];
  
  // Add API client
  imports.push(`import ApiClient from './api-client';`);
  exports.push('ApiClient');
  
  // Add REST hooks if enabled
  if (config.api.rest.enabled) {
    imports.push(`import { useFetch, useCreate, useUpdate, useDelete, useAuth } from './rest-hooks';`);
    exports.push('useFetch', 'useCreate', 'useUpdate', 'useDelete', 'useAuth');
  }
  
  // Add GraphQL hooks if enabled
  if (config.api.graphql.enabled) {
    imports.push(`import { useQuery, useMutation } from './graphql-hooks';`);
    exports.push('useQuery', 'useMutation');
  }
  
  // Add WebSocket hooks if enabled
  if (config.api.websocket.enabled) {
    imports.push(`import { useWebSocket, useSubscription } from './websocket-hooks';`);
    exports.push('useWebSocket', 'useSubscription');
  }
  
  return `
${imports.join('\n')}

export {
  ${exports.join(',\n  ')}
};
`;
}

module.exports = {
  generateReactSDK
}; 