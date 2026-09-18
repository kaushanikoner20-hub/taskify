# ---------- Stage 1: build Tailwind CSS ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tailwind.config.js postcss.config.js ./
COPY public ./public
RUN npm run build:css

# ---------- Stage 2: production runtime (nginx) ----------
FROM nginx:1.27-alpine AS production

# Remove default nginx static assets and config
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]