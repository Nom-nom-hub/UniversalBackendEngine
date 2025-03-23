# Getting Started

This guide will help you set up and run the Universal Backend Engine.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 16+
- PostgreSQL, MySQL, or MongoDB
- Redis (optional, for caching)
- Docker (optional, for containerized deployment)

## Installation

### Standard Installation

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

### Docker Installation

1. Navigate to the docker directory:
   ```bash
   cd docker
   ```

2. Start the services using Docker Compose:
   ```bash
   docker-compose up -d
   ```

This will start the application along with PostgreSQL and Redis services.

## Verifying Installation

Once the server is running, you can verify the installation by:

1. Accessing the REST API documentation at: http://localhost:3000/api/v1/docs
2. If GraphQL is enabled, accessing the GraphQL playground at: http://localhost:3000/graphql

## Project Structure

The project follows a modular structure:

```
universal-backend-engine/
├── src/
│   ├── config/                 # Configuration files
│   ├── core/                   # Core engine components
│   │   ├── api-generators/     # API type generators
│   │   ├── database/           # Database adapters
│   │   ├── auth/               # Authentication services
│   │   ├── sdk-generators/     # Frontend SDK generators
│   │   └── utils/              # Utility functions
│   ├── middleware/             # Express middleware
│   ├── services/               # Business logic services
│   ├── models/                 # Data models
│   └── server.js               # Main server entry point
├── tests/                      # Test files
├── docker/                     # Docker configuration
└── kubernetes/                 # Kubernetes configuration
```

## Next Steps

- Learn about [Configuration](./configuration.md)
- Explore [API Generation](./api-generation.md)
- Set up [Database Integration](./database-integration.md)