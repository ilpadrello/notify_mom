FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create volumes directories
RUN mkdir -p /app/logs /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const fs = require('fs'); if(fs.existsSync('/app/data/app.db')) { console.log('OK'); process.exit(0); } else { process.exit(1); }"

# Start application
CMD ["npm", "start"]
