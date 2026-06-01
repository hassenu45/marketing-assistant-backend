# Frontend builder
FROM node:20-slim AS frontend
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Backend runtime
FROM node:20-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .
COPY --from=frontend /build/dist ./dist

EXPOSE 3001
CMD ["node", "server.js"]
