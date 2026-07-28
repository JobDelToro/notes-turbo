# syntax=docker/dockerfile:1

# --- build stage: compile TypeScript to dist/ ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime stage: production deps + compiled output only ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Drop root.
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 8000
CMD ["node", "dist/main.js"]
