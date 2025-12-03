FROM node:20-lts-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY common/package.json ./common/
COPY sdk/package.json ./sdk/
COPY web-ui/package.json ./web-ui/

# Install dependencies
RUN npm ci

# Copy source code
COPY common ./common
COPY sdk ./sdk
COPY web-ui ./web-ui

# Build common and sdk
RUN npm run build --workspace=common
RUN npm run build --workspace=sdk

# Build Next.js app
WORKDIR /app/web-ui
RUN npm run build

# Production stage
FROM node:20-lts-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY common/package.json ./common/
COPY sdk/package.json ./sdk/
COPY web-ui/package.json ./web-ui/

# Install production dependencies
RUN npm ci --production

# Copy built artifacts
COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/sdk/dist ./sdk/dist
COPY --from=builder /app/common/package.json ./common/
COPY --from=builder /app/sdk/package.json ./sdk/
COPY --from=builder /app/web-ui/.next ./web-ui/.next
COPY --from=builder /app/web-ui/public ./web-ui/public
COPY --from=builder /app/web-ui/package.json ./web-ui/
COPY --from=builder /app/web-ui/next.config.js ./web-ui/
COPY --from=builder /app/web-ui/tsconfig.json ./web-ui/

WORKDIR /app/web-ui

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]

