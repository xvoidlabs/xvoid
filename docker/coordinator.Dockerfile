FROM node:20-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build --workspace common && \
    npm run build --workspace ai && \
    npm run build --workspace coordinator && \
    npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app /app

EXPOSE 4000
CMD ["node", "coordinator/dist/server.js"]

