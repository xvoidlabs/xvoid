FROM node:20-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build --workspace common && \
    npm run build --workspace sdk && \
    npm run build --workspace web-ui && \
    npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app/web-ui

ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder /app /app

EXPOSE 3000
CMD ["npm", "run", "start"]

