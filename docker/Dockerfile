FROM node:16-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose ports
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 