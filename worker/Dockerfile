# Curia Curator worker. Build context is the /worker directory itself
# (see railway.json's watchPatterns / the README's Railway setup steps) —
# this Dockerfile does not read anything from the parent repo, all real
# data access goes through the Supabase client at runtime, not the
# filesystem.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY markets.yaml ./markets.yaml

# No CMD/ENTRYPOINT — railway.json's two cron services each specify their
# own startCommand (node dist/run-discovery.js / node dist/run-promotion.js)
# rather than baking one into the image, since this one image serves both
# crons.
