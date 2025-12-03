FROM node:20-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build --workspace common && \
    npm run build --workspace node && \
    npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app /app

CMD ["node", "node/dist/index.js"]

