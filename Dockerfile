# =============================================================================
# Jot — Cute & Colorful Note-Taking App
# Multi-stage Docker build for production deployment (Proxmox / Portainer etc.)
# =============================================================================

# ---- Deps stage ------------------------------------------------------------
# Install only production node_modules for a lean, reproducible layer.
FROM node:22-slim AS deps

ENV npm_config_audit=false \
    npm_config_fund=false

WORKDIR /app

# Copy lockfile + manifest first to maximise Docker layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- Runtime stage ---------------------------------------------------------
FROM node:22-slim AS runtime

# Create a non-root user/group for security.
RUN groupadd --system --gid 1001 appgroup \
 && useradd  --system --uid 1001 --gid appgroup --create-home appuser

WORKDIR /app

# Copy installed production dependencies from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application source files from the build context (respects .dockerignore).
COPY --chown=appuser:appgroup \
  package.json \
  server.js \
  index.html \
  app.js \
  styles.css \
  ./

# Ensure the non-root user owns every file (node_modules etc.) and that the
# data directory exists for runtime writes.
RUN mkdir -p /app/data \
 && chown -R appuser:appgroup /app

# Expose the default Express port (overridable via PORT env var).
EXPOSE 3000

# Switch to the non-root user.
USER appuser

# Environment defaults — override at runtime with `docker run -e ...` or compose.
# NOTE: JOT_SECRET_KEY is intentionally NOT set here. When the container starts
# without it, server.js auto-generates a random key for AES-256-GCM encryption.
# Set it at runtime for portability across machines:  docker run -e JOT_SECRET_KEY=...
ENV NODE_ENV=production \
    PORT=3000

# Healthcheck: probe the /api/notes endpoint every 30 s.
HEALTHCHECK --interval=30s --timeout=2s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const {PORT=3000}=process.env;const s=http.get('http://127.0.0.1:'+PORT+'/api/notes',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1));s.setTimeout(2000,()=>{s.destroy();process.exit(1)})"

# Start the Express server.
CMD ["node", "server.js"]
