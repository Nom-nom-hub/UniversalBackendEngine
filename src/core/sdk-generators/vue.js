const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generate Vue.js SDK for the API
 */
async function generateVueSDK(config, outputDir) {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate API client
    const apiClientCode = generateApiClient(config);
    fs.writeFileSync(path.join(outputDir, 'api-client.js'), apiClientCode);
    
    // Generate composables for REST API
    if (config.api.rest.enabled) {
      const restComposablesCode = generateRestComposables(config);
      fs.writeFileSync(path.join(outputDir, 'rest-composables.js'), restComposablesCode);
    }
    
    // Generate composables for GraphQL API
    if (config.api.graphql.enabled) {
      const graphqlComposablesCode = generateGraphQLComposables(config);
      fs.writeFileSync(path.join(outputDir, 'graphql-composables.js'), graphqlComposablesCode);
    }
    
    // Generate composables for WebSocket API
    if (config.api.websocket.enabled) {
      const websocketComposablesCode = generateWebSocketComposables(config);
      fs.writeFileSync(path.join(outputDir, 'websocket-composables.js'), websocketComposablesCode);
    }
    
    // Generate index file
    const indexCode = generateIndexFile(config);
    fs.writeFileSync(path.join(outputDir, 'index.js'), indexCode);
    
    logger.info(`Vue.js SDK generated successfully in ${outputDir}`);
    return true;
  } catch (error) {
    logger.error('Failed to generate Vue.js SDK:', error);
    throw error;
  }
}

/**
 * Generate API client code for Vue.js
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
    this.headers = options.headers || {};
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      }
    });
    
    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = \`Bearer \${token}\`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  
  // Generic request method
  async request(method, url, data = null, options = {}) {
    try {
      const response = await this.client({
        method,
        url,
        data,
        ...options
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Request failed');
      }
      throw error;
    }
  }
  
  // GET request
  get(url, options = {}) {
    return this.request('get', url, null, options);
  }
  
  // POST request
  post(url, data, options = {}) {
    return this.request('post', url, data, options);
  }
  
  // PUT request
  put(url, data, options = {}) {
    return this.request('put', url, data, options);
  }
  
  // DELETE request
  delete(url, options = {}) {
    return this.request('delete', url, null, options);
  }
  
  // Authentication methods
  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    return response;
  }
  
  async register(userData) {
    return this.post('/auth/register', userData);
  }
  
  logout() {
    localStorage.removeItem('auth_token');
  }
}

export default ApiClient;
`;
}

/**
 * Generate REST composables for Vue.js
 */
function generateRestComposables(config) {
  return `
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import ApiClient from './api-client';

// Create a default API client instance
const defaultClient = new ApiClient();

/**
 * Composable for fetching data from REST API
 */
export function useFetch(url, options = {}) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);
  const client = options.client || defaultClient;
  
  const fetchData = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      data.value = await client.get(url, options);
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching data:', err);
    } finally {
      loading.value = false;
    }
  };
  
  // Fetch data on mount if autoFetch is true (default)
  if (options.autoFetch !== false) {
    onMounted(fetchData);
  }
  
  return {
    data,
    error,
    loading,
    fetch: fetchData
  };
}

/**
 * Composable for creating data via REST API
 */
export function useCreate(url, options = {}) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);
  const client = options.client || defaultClient;
  
  const create = async (payload) => {
    loading.value = true;
    error.value = null;
    
    try {
      data.value = await client.post(url, payload, options);
      return data.value;
    } catch (err) {
      error.value = err.message;
      console.error('Error creating data:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  return {
    data,
    error,
    loading,
    create
  };
}

/**
 * Composable for updating data via REST API
 */
export function useUpdate(urlTemplate, options = {}) {
  const data = ref(null);
  const error = ref(null);
  const loading = ref(false);
  const client = options.client || defaultClient;
  
  const update = async (id, payload) => {
    const url = urlTemplate.replace(':id', id);
    loading.value = true;
    error.value = null;
    
    try {
      data.value = await client.put(url, payload, options);
      return data.value;
    } catch (err) {
      error.value = err.message;
      console.error('Error updating data:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  return {
    data,
    error,
    loading,
    update
  };
}

/**
 * Composable for deleting data via REST API
 */
export function useDelete(urlTemplate, options = {}) {
  const error = ref(null);
  const loading = ref(false);
  const client = options.client || defaultClient;
  
  const remove = async (id) => {
    const url = urlTemplate.replace(':id', id);
    loading.value = true;
    error.value = null;
    
    try {
      await client.delete(url, options);
      return true;
    } catch (err) {
      error.value = err.message;
      console.error('Error deleting data:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  return {
    error,
    loading,
    remove
  };
}

/**
 * Composable for authentication
 */
export function useAuth(options = {}) {
  const client = options.client || defaultClient;
  const user = ref(null);
  const error = ref(null);
  const loading = ref(false);
  const isAuthenticated = computed(() => !!user.value);
  
  const login = async (credentials) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await client.login(credentials);
      user.value = response.user;
      return response;
    } catch (err) {
      error.value = err.message;
      console.error('Login error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const register = async (userData) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await client.register(userData);
      return response;
    } catch (err) {
      error.value = err.message;
      console.error('Registration error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const logout = () => {
    client.logout();
    user.value = null;
  };
  
  return {
    user,
    error,
    loading,
    isAuthenticated,
    login,
    register,
    logout
  };
}
`;
}

/**
 * Generate GraphQL composables for Vue.js
 */
function generateGraphQLComposables(config) {
  // Implementation for GraphQL composables
  // ...
}

/**
 * Generate WebSocket composables for Vue.js
 */
function generateWebSocketComposables(config) {
  // Implementation for WebSocket composables
  // ...
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
  
  // Add REST composables if enabled
  if (config.api.rest.enabled) {
    imports.push(`import { useFetch, useCreate, useUpdate, useDelete, useAuth } from './rest-composables';`);
    exports.push('useFetch', 'useCreate', 'useUpdate', 'useDelete', 'useAuth');
  }
  
  // Add GraphQL composables if enabled
  if (config.api.graphql.enabled) {
    imports.push(`import { useQuery, useMutation } from './graphql-composables';`);
    exports.push('useQuery', 'useMutation');
  }
  
  // Add WebSocket composables if enabled
  if (config.api.websocket.enabled) {
    imports.push(`import { useWebSocket, useSubscription } from './websocket-composables';`);
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
  generateVueSDK
}; 