# ---------- Stage 1: install dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---------- Stage 2: production runtime ----------
FROM node:20-alpine AS production
WORKDIR /app

# Run as non-root user
RUN addgroup -S taskify && adduser -S taskify -G taskify

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY db ./db
COPY routes ./routes
COPY middleware ./middleware

USER taskify

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]