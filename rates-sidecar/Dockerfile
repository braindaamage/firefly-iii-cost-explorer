FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source files
COPY index.js ./
COPY src/ ./src/

# Non-root user for security
RUN addgroup -S sidecar && adduser -S sidecar -G sidecar
RUN chown -R sidecar:sidecar /app
USER sidecar

# Default timezone (can be overridden via TZ env var in docker-compose)
ENV TZ=Europe/Madrid

# Healthcheck: /tmp/last-success must be written within the last 30 hours
# (30h = 24h cron interval + 6h margin)
HEALTHCHECK --interval=5m --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const fs=require('fs'); const ts=parseInt(fs.readFileSync('/tmp/last-success','utf8'),10); if(Date.now()-ts>108000000) process.exit(1)"

CMD ["node", "index.js"]
