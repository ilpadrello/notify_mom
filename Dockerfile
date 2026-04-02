# ============================================================================
# Stage 1: Build Stage
# Compiles TypeScript to JavaScript
# Runs on the build machine (can be powerful, any architecture)
# ============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for sqlite3 compilation on ARM
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript to JavaScript
RUN npm run build

# ============================================================================
# Stage 2: Runtime Stage
# Lightweight runtime image for Raspberry Pi (ARM64)
# Contains ONLY production dependencies and compiled JS
# ============================================================================
FROM node:20-slim

# Set metadata for ARM compatibility
LABEL org.opencontainers.image.description="Notify Mom - Production Runtime"
LABEL org.opencontainers.image.version="1.0.0"

WORKDIR /app

# Install build dependencies for sqlite3 compilation on ARM
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files from builder
COPY package*.json ./

# Install ONLY production dependencies (no devDependencies)
# Use --legacy-peer-deps to match builder stage
RUN npm ci --legacy-peer-deps --omit=dev && \
    npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/build ./build

# Create volumes directories for runtime
RUN mkdir -p /app/logs /app/data

# Health check: Verify database exists
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const fs = require('fs'); if(fs.existsSync('/app/data/app.db')) { console.log('OK'); process.exit(0); } else { process.exit(1); }"

# Start application with node (not npm to avoid shell overhead)
CMD ["node", "build/index.js"]
