# SDK Generation

Universal Backend Engine can automatically generate client SDKs for your APIs, making it easier for frontend developers to interact with your backend services.

## Supported SDK Types

- **JavaScript/TypeScript**: For web applications
- **React**: Hooks and components for React applications
- **Vue.js**: Composables and components for Vue applications
- **Flutter**: Dart code for mobile applications
- **Swift**: For iOS applications
- **Kotlin**: For Android applications

## Configuration

Configure SDK generation in your configuration file:

```javascript
{
  "sdkGeneration": {
    "enabled": true,
    "output": "./sdk",
    "targets": ["javascript", "react", "vue", "flutter"],
    "options": {
      "typescript": true,
      "includeTests": true,
      "bundler": "webpack"
    }
  }
}
```

## Generating SDKs

To generate SDKs for your APIs, run:

```bash
npm run generate-sdk
```

This will create SDK files in the specified output directory for each target platform.

## JavaScript/TypeScript SDK Example

The generated JavaScript/TypeScript SDK provides typed API clients:

```javascript
// Example of using the generated SDK
import { UserApi, ProductApi } from 'my-backend-sdk';

// Initialize the API with configuration
const userApi = new UserApi({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

// Use the API
async function getUsers() {
  try {
    const users = await userApi.getUsers();
    console.log(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
  }
}
```

## React SDK Example

The React SDK includes hooks for easy API integration:

```jsx
import { useUsers, useProducts } from 'my-backend-sdk/react';

function UserList() {
  const { data: users, isLoading, error } = useUsers();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Vue.js SDK Example

The Vue SDK includes composables for Vue 3:

```vue
<template>
  <div>
    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <ul v-else>
      <li v-for="product in products" :key="product.id">
        {{ product.name }} - ${{ product.price }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useProducts } from 'my-backend-sdk/vue';

const { products, isLoading, error } = useProducts();
</script>
```

## Flutter SDK Example

The Flutter SDK provides Dart classes and methods:

```dart
import 'package:my_backend_sdk/my_backend_sdk.dart';

class UserListScreen extends StatefulWidget {
  @override
  _UserListScreenState createState() => _UserListScreenState();
}

class _UserListScreenState extends State<UserListScreen> {
  final UserApi userApi = UserApi();
  List<User> users = [];
  bool isLoading = true;
  
  @override
  void initState() {
    super.initState();
    fetchUsers();
  }
  
  Future<void> fetchUsers() async {
    try {
      final fetchedUsers = await userApi.getUsers();
      setState(() {
        users = fetchedUsers;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        isLoading = false;
      });
      print('Error fetching users: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    // Widget implementation
  }
}
```

## Customizing SDK Generation

You can customize the SDK generation process by providing templates and plugins:

```javascript
{
  "sdkGeneration": {
    "templates": {
      "react": "./sdk-templates/react",
      "vue": "./sdk-templates/vue"
    },
    "plugins": [
      "./sdk-plugins/add-authentication.js",
      "./sdk-plugins/add-logging.js"
    ]
  }
}
```

## SDK Versioning

The generated SDKs include version information that matches your API version, making it easier to manage compatibility between frontend and backend.