# ─── Stage 1: Clone full repo ───
FROM alpine/git AS repo
WORKDIR /source
RUN git clone --depth 1 https://github.com/hassenu45/marketing-assistant-backend.git .

# ─── Stage 2: Build frontend ───
FROM node:20-slim AS frontend
WORKDIR /build
COPY --from=repo /source/package*.json ./
RUN npm ci
COPY --from=repo /source/ ./
RUN npm run build

# ─── Stage 3: Backend runtime ───
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
COPY --from=frontend /build/dist ./dist

EXPOSE 3001
CMD ["node", "server.js"]
