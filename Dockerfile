FROM node:20-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build
RUN chmod +x ./build/index.js

# Copy script
COPY run.sh .
RUN chmod +x run.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Change ownership and switch to non-root user
RUN chown -R mcp:nodejs /app
USER mcp

CMD ["./run.sh"]
