# ---- Build Stage ----
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json turbo.json ./
COPY tsconfig.base.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install all dependencies
RUN npm ci

# Generate Prisma client
RUN npm run db:generate

# Build the API
RUN npm run build --workspace=@wheelsai/api

# ---- Production Stage ----
FROM node:20-alpine AS runner

# Install dependencies for runtime (argon2 needs these)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wheelsai

# Copy built application
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000

# Switch to non-root user
USER wheelsai

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the API
CMD ["node", "apps/api/dist/index.js"]
