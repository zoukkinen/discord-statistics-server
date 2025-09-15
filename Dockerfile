# Multi-stage build for better security and smaller image size
# Stage 1: Build stage
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:24-alpine AS production

# Install wget for health checks and security updates
RUN apk add --no-cache wget dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies based on NODE_ENV
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN if [ "$NODE_ENV" = "development" ]; then \
      npm ci && npm cache clean --force; \
    else \
      npm ci --only=production && npm cache clean --force; \
    fi

# Copy application files based on mode
RUN if [ "$NODE_ENV" = "development" ]; then \
      echo "Development mode: copying source files"; \
    else \
      echo "Production mode: copying built files"; \
    fi

# Copy built application from builder stage (production)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy source files for development
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S discord-bot -u 1001 -G nodejs

# Create data directory with proper permissions
RUN mkdir -p /app/data
RUN chown -R discord-bot:nodejs /app
RUN chmod -R 755 /app

# Switch to non-root user
USER discord-bot

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling and start the application
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then dumb-init npm run dev; else dumb-init node dist/index.js; fi"]
