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

# nginx:alpine does not ship wget or curl by default - install curl
# so the HEALTHCHECK below can actually run instead of failing silently.
RUN apk add --no-cache curl

# Remove default nginx static assets and config
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Use 127.0.0.1 explicitly (not "localhost") - some Alpine images resolve
# "localhost" to the IPv6 loopback (::1) first, and if nginx only listens
# on the IPv4 socket, that lookup gets refused even though nginx is healthy.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD curl -f http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]