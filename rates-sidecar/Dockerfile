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

# Default timezone (can be overridden via TZ env var in docker-compose)
ENV TZ=Europe/Madrid

# The sidecar runs as a long-lived Node process — no CMD needed for port exposure
CMD ["node", "index.js"]
