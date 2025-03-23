# SDK Generation

Universal Backend Engine can automatically generate client SDKs for various frontend frameworks, making it easier to integrate your backend with different frontend applications.

## Supported Frameworks

- React
- Next.js
- Vue.js
- Flutter
- Unity

## Configuration

Enable SDK generation in your configuration:

```javascript
{
  "sdkGeneration": {
    "enabled": true,
    "targets": ["react", "nextjs", "flutter", "unity", "vue"]
  }
}
```

## Generating SDKs

### Command Line

Generate SDKs using the provided script:

```bash
npm run generate-sdk
```

This will create SDK files in the `sdk/` directory for each target framework specified in your configuration.

### Programmatic Generation

You can also generate SDKs programmatically:

```javascript
const { generateReactSDK } = require('./core/sdk-generators/react');
const { generateVueSDK } = require('./core/sdk-generators/vue');

// Generate React SDK
await generateReactSDK(config, './sdk/react');

// Generate Vue SDK
await generateVueSDK(config, './sdk/vue');
```

## SDK Structure

Each generated SDK includes:

- API client for making HTTP requests
- Hooks/composables for data fetching and mutations
- Authentication utilities
- WebSocket integration (if enabled)
- GraphQL integration (if enabled)

### React SDK Example

```javascript
// Using the React SDK
import { useFetch, useCreate, useAuth } from 'universal-backend-sdk';

// Authentication
const { login, logout, isAuthenticated, user } = useAuth();

// Fetch data
const { data, loading, error, refetch } = useFetch('/users');

// Create data
const { create, loading: createLoading, error: createError } = useCreate('/users');

// Usage
const handleSubmit = async (userData) => {
  await create(userData);
  refetch();
};
```

### Vue.js SDK Example

```javascript
// Using the Vue.js SDK
import { useFetch, useCreate, useAuth } from 'universal-backend-sdk';

export default {
  setup() {
    // Authentication
    const { login, logout, isAuthenticated, user } = useAuth();
    
    // Fetch data
    const { data, loading, error, refetch } = useFetch('/users');
    
    // Create data
    const { create, loading: createLoading, error: createError } = useCreate('/users');
    
    // Methods
    const handleSubmit = async (userData) => {
      await create(userData);
      refetch();
    };
    
    return {
      data,
      loading,
      error,
      handleSubmit,
      isAuthenticated,
      user,
      login,
      logout
    };
  }
};
```

## Customizing SDK Generation

You can customize the SDK generation by modifying the generator files in `src/core/sdk-generators/`.

For example, to add custom functionality to the React SDK:

```javascript
// src/core/sdk-generators/react.js
function generateApiClient(config) {
  return `
import axios from 'axios';

class ApiClient {
  // ... existing code
  
  // Add custom methods
  async uploadFile(file, path) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post(\`\${path}/upload\`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}

export default ApiClient;
  `;
}
```

## SDK Usage Documentation

When SDKs are generated, documentation is also created in the `sdk/{framework}/README.md` file, explaining how to use the SDK with examples.