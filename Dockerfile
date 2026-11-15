# syntax=docker/dockerfile:1

# ---------- Build stage: install exact dependencies and build the bundle ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copy the manifests first, so the (slow) dependency layer is only rebuilt when
# package.json or the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the source and run the project's own build (tsc -b && vite build).
COPY . .
RUN npm run build

# ---------- Runtime stage: static files only, no Node in the final image ----------
FROM nginx:1.27-alpine AS runtime

# Replace the default site with the SPA configuration (port 8080 + fallback).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Only the built output crosses into the runtime image.
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run routes traffic to this port.
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
