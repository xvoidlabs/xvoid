FROM node:20-lts-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY common/package.json ./common/
COPY node/package.json ./node/

# Install dependencies
RUN npm ci

# Copy source code
COPY common ./common
COPY node ./node

# Build
RUN npm run build --workspace=common
RUN npm run build --workspace=node

# Production stage
FROM node:20-lts-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY common/package.json ./common/
COPY node/package.json ./node/

# Install production dependencies only
RUN npm ci --production

# Copy built artifacts
COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/node/dist ./node/dist
COPY --from=builder /app/common/package.json ./common/
COPY --from=builder /app/node/package.json ./node/

WORKDIR /app/node

CMD ["node", "dist/index.js"]

