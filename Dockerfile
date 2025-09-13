FROM node:20-alpine
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build
RUN chmod +x ./build/index.js

# Install MCP proxy
RUN uv tool install mcp-proxy

# Copy script
COPY run.sh .
RUN chmod +x run.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Change ownership and switch to non-root user
RUN chown -R mcp:nodejs /app
USER mcp

EXPOSE 8080
CMD ["./run.sh"]
