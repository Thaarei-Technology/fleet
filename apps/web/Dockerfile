# syntax=docker/dockerfile:1
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS build
WORKDIR /workspace
COPY . .
RUN corepack enable
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    pnpm install --frozen-lockfile --ignore-scripts --filter @thaarei/web-app...
RUN pnpm --filter @thaarei/web-app... build
RUN pnpm --filter @thaarei/web-app --prod deploy /runtime
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runtime
ENV NODE_ENV=production
ARG SOURCE_COMMIT=local
ARG IMAGE_VERSION=0.1.0-dev.1
LABEL org.opencontainers.image.source="generated-private-repository" \
      org.opencontainers.image.description="Thaarei Fleet web" \
      org.opencontainers.image.version="$IMAGE_VERSION" \
      org.opencontainers.image.revision="$SOURCE_COMMIT"
WORKDIR /app
COPY --from=build --chown=1000:1000 /runtime/ ./
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
STOPSIGNAL SIGTERM
CMD ["./node_modules/.bin/next", "start"]
