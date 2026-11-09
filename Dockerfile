# --- Etapa 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa 2: Produção (Nginx) ---
FROM nginx:alpine-slim AS production

# Copiar ficheiros estáticos gerados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração personalizada do Nginx para suporte a SPA (rotas frontend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
