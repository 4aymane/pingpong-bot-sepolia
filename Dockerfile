FROM node:20-alpine

# Install sqlite3 dependencies
RUN apk add --no-cache sqlite python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including TypeScript)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create data directory for persistent storage (database)
RUN mkdir -p /data

# Run the bot
CMD ["node", "dist/index.js"]


