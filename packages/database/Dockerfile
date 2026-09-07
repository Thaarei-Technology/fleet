# syntax=docker/dockerfile:1
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS build
WORKDIR /workspace
COPY . .
RUN corepack enable
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @thaarei/database...
RUN pnpm --filter @thaarei/database... build
RUN pnpm --filter @thaarei/database --prod deploy /runtime
COPY packages/database/migrations /runtime/migrations
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runtime
ENV NODE_ENV=production
ARG SOURCE_COMMIT=local
ARG IMAGE_VERSION=0.1.0-dev.1
LABEL org.opencontainers.image.source="generated-private-repository" \
      org.opencontainers.image.description="Thaarei Fleet database migration job" \
      org.opencontainers.image.version="$IMAGE_VERSION" \
      org.opencontainers.image.revision="$SOURCE_COMMIT"
WORKDIR /app
COPY --from=build --chown=1000:1000 /runtime/ ./
USER 1000:1000
STOPSIGNAL SIGTERM
CMD ["node", "dist/migrate.js"]
