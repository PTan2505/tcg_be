# syntax = docker/dockerfile:1

# Base image
ARG NODE_VERSION=20.19.5
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="NodeJS"

WORKDIR /app

# ===== Build stage =====
FROM base AS build

# Install build tools
RUN apt-get update -qq && apt-get install -y python-is-python3 pkg-config build-essential

# Copy only package files first (for caching)
COPY package*.json ./

# Install all dependencies (including dev)
ENV NODE_ENV=development
RUN npm install

# Copy all project files
COPY . .

# ✅ Copy Google service key into build stage
COPY gen-lang-client-0549852682-76c51df076d2.json /app/gen-lang-client-0549852682-76c51df076d2.json

# ✅ Build TypeScript → JavaScript
RUN npx tsc

# ===== Final stage =====
FROM base AS final

WORKDIR /app

# Copy only package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# ✅ Copy built JS from build stage
COPY --from=build /app/dist ./dist

# ✅ Copy static data folders (your card data)
COPY --from=build /app/data/cards /app/data/cards
COPY --from=build /app/data/sets /app/data/sets

# ✅ Copy credentials file
COPY --from=build /app/gen-lang-client-0549852682-76c51df076d2.json /app/gen-lang-client-0549852682-76c51df076d2.json

# ✅ Copy non-TypeScript static assets (email templates, swagger HTML, etc.)
# TypeScript compilation doesn't copy non-TS files, so we need to copy the
# source config/templates into the runtime dist folder so `__dirname` paths
# used in the compiled code (e.g. `/app/dist/shared/config/...`) exist.
COPY --from=build /app/src/shared/config /app/dist/shared/config

# Set environment variables
ENV NODE_ENV=production
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/gen-lang-client-0549852682-76c51df076d2.json"

# Expose port (Fly auto-detects this)
EXPOSE 8080

# Start app
CMD ["node", "dist/server.js"]
