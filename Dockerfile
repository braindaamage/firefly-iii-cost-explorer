# ============================================================
# Firefly III Cost Explorer — single image (SPA + rates-sidecar)
# ============================================================
# Builds a single image that runs, simultaneously:
#   - nginx serving the built SPA on :8080  (same as before)
#   - rates-sidecar (node) as a background process under supervisord
#
# Build context: repo root (firefly-iii-cost-explorer/)
# Build command (unchanged from previous):
#   docker build --push -t registry.braindaamage.cloud/firefly-iii-cost-explorer:production .

# ------------------------------------------------------------
# Stage 1 — build the SPA
# ------------------------------------------------------------
FROM node:22.14-alpine AS spa-build
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (not ci) — lock file omits alpine/musl native bindings that
# rolldown (Vite 8) requires; npm resolves the correct platform packages here
RUN npm install
COPY . .
RUN npm run build

# ------------------------------------------------------------
# Stage 2 — install sidecar production deps
# ------------------------------------------------------------
FROM node:22.14-alpine AS sidecar-deps
WORKDIR /sidecar
COPY rates-sidecar/package.json rates-sidecar/package-lock.json ./
RUN npm ci --omit=dev

# ------------------------------------------------------------
# Stage 3 — final runtime
# ------------------------------------------------------------
FROM node:22.14-alpine AS runtime

# Install nginx + supervisord + tini from alpine repos.
# ca-certificates is included so that any HTTPS outbound from userland
# tools (curl/wget) trusts the Mozilla bundle. Node respects
# NODE_EXTRA_CA_CERTS at runtime for internal CAs — no build-time change
# required for that path.
RUN apk add --no-cache \
      nginx \
      supervisor \
      tini \
      tzdata \
      ca-certificates \
    && rm -rf /var/cache/apk/*

# --- nginx wiring -------------------------------------------
RUN mkdir -p /usr/share/nginx/html /run/nginx /var/log/nginx \
    && chown -R nginx:nginx /usr/share/nginx/html /run/nginx /var/log/nginx

# Copy the built SPA from stage 1
COPY --from=spa-build /app/dist /usr/share/nginx/html

# Copy the SPA nginx config. Defaults to nginx.conf (static-only, production),
# but the build arg NGINX_CONF can override it to nginx.dev.conf for the local
# end-to-end stack (firefly-iii-mcp/docker-compose.dev.yml sets it there).
# Alpine's nginx.conf includes /etc/nginx/http.d/*.conf so server blocks live there.
ARG NGINX_CONF=nginx.conf
COPY ${NGINX_CONF} /etc/nginx/http.d/default.conf

# --- sidecar wiring -----------------------------------------
# Copy sidecar source + production node_modules.
# IMPORTANT: package.json MUST be present in /sidecar/ at runtime — the
# sidecar declares "type": "module" and Node refuses ESM imports without it.
WORKDIR /sidecar
COPY --chown=node:node rates-sidecar/package.json ./package.json
COPY --chown=node:node rates-sidecar/index.js ./index.js
COPY --chown=node:node rates-sidecar/src ./src
COPY --from=sidecar-deps --chown=node:node /sidecar/node_modules ./node_modules

# --- supervisord wiring -------------------------------------
COPY supervisord.conf /etc/supervisord.conf

# Default timezone — overridable via `environment: TZ:` in docker-compose
ENV TZ=Europe/Madrid

# Nginx listens here (same as current image)
EXPOSE 8080

# tini as PID 1 for clean signal handling; supervisord manages children.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
