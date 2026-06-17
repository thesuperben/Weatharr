# ==============================================================================
# Weatharr - Bundled Single-Container Dockerfile
# ==============================================================================
# This Dockerfile uses multi-stage builds to compile the static React frontend
# assets and bundle them inside the Node.js Express backend runtime.
# This eliminates the Nginx container, allowing the entire application code
# to serve out of a single service container.
# ==============================================================================

# --- Stage 1: Frontend Builder ---
FROM node:20-alpine AS builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and compile production static assets
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Runtime Production Container ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend server code
COPY backend/ ./

# Copy built frontend assets from Stage 1 into the backend container
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose backend port
EXPOSE 5000

CMD ["node", "src/server.js"]
