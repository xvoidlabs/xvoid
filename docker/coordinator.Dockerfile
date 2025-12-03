FROM node:20-lts-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY common/package.json ./common/
COPY ai/package.json ./ai/
COPY coordinator/package.json ./coordinator/

# Install dependencies
RUN npm ci

# Copy source code
COPY common ./common
COPY ai ./ai
COPY coordinator ./coordinator

# Build
RUN npm run build --workspace=common
RUN npm run build --workspace=ai
RUN npm run build --workspace=coordinator

# Production stage
FROM node:20-lts-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY common/package.json ./common/
COPY ai/package.json ./ai/
COPY coordinator/package.json ./coordinator/

# Install production dependencies only
RUN npm ci --production

# Copy built artifacts
COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/ai/dist ./ai/dist
COPY --from=builder /app/coordinator/dist ./coordinator/dist
COPY --from=builder /app/common/package.json ./common/
COPY --from=builder /app/ai/package.json ./ai/
COPY --from=builder /app/coordinator/package.json ./coordinator/

WORKDIR /app/coordinator

EXPOSE 3001

CMD ["node", "dist/index.js"]

