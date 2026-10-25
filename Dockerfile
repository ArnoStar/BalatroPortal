# syntax=docker/dockerfile:1
# The portal in a container, and the site's front door: nginx serves the
# portal at / and passes /play/, /api/ and /identity/ to the game, the game API
# and the identity service (see docker/nginx.conf.template).
#
#   docker build --network host -t balatro-portal .
#   docker run -p 8087:80 -e GAME_UPSTREAM=http://web:80 -e API_UPSTREAM=http://api:8000 \
#     -e IDENTITY_UPSTREAM=http://identity:8000 balatro-portal
#
# (BalatroFrontEnd's docker-compose.yml runs it with the rest.)

FROM node:22-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
# other origins for the API, the identity service or the game (by default all on this one)
ARG VITE_API_URL=""
ARG VITE_IDENTITY_URL=""
ARG VITE_GAME_URL=""
RUN npm run build

FROM nginx:1.28-alpine
ENV GAME_UPSTREAM=http://web:80 \
    API_UPSTREAM=http://api:8000 \
    IDENTITY_UPSTREAM=http://identity:8000 \
    REPORTS_UPSTREAM=http://reports:8000 \
    RESOLVER=127.0.0.11
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1/"]
