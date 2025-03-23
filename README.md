# Universal Backend Engine

A modular, adaptive backend that dynamically generates APIs (REST, GraphQL, WebSockets, gRPC) and works seamlessly with various front-end frameworks.

## Features

- **Dynamic API Generation**: Automatically generates REST, GraphQL, WebSockets, and gRPC endpoints based on configurations.
- **Adaptive Database Layer**: Supports PostgreSQL, MySQL, and MongoDB, with automatic query optimization.
- **Authentication & Security**: JWT-based authentication, with support for OAuth2 & API Keys.
- **Front-End Adaptability**: Generates SDKs for React, Next.js, Flutter, Unity, and Vue.js.
- **Scalability & Deployment**: Containerized with Docker & Kubernetes for cloud-native deployment.

## Getting Started

### Prerequisites

- Node.js 16+
- PostgreSQL, MySQL, or MongoDB
- Redis (optional, for caching)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/universal-backend-engine.git
   cd universal-backend-engine
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-secret-key
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=universal_backend
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Docker Deployment

1. Build and run using Docker Compose:
   ```bash
   cd docker
   docker-compose up -d
   ```

### Kubernetes Deployment

1. Apply the Kubernetes configuration:
   ```bash
   kubectl apply -f kubernetes/deployment.yaml
   ```

## Configuration

The Universal Backend Engine is highly configurable. You can customize it by:

1. Modifying the `.env` file for environment-specific settings.
2. Creating a `config.json` file in the root directory for more detailed configuration.
3. Using environment variables with the `UBE_` prefix to override specific settings.

## API Documentation

- REST API documentation is available at `/api/v1/docs` when the server is running.
- GraphQL playground is available at `/graphql` in development mode.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 