# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all deps (including dev for tsc)
COPY package.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN npm run build

# Generate Prisma client for linux-musl target
RUN npx prisma generate

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY package.json ./
RUN npm install --omit=dev

# Copy built output and Prisma artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Create data directory for SQLite volume mount
RUN mkdir -p /data

EXPOSE 3001

CMD ["node", "dist/index.js"]
