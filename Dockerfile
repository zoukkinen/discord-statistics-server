# Multi-stage build for better security and smaller image size
# Stage 1: Build stage
FROM node:20-alpine AS builder

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
FROM node:20-alpine AS production

# Install wget for health checks and security updates
RUN apk add --no-cache wget dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

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
CMD ["dumb-init", "node", "dist/index.js"]
