# ── SistemaEmpleadosFrontend — CRA compilado y servido por nginx ───────────
FROM node:20-alpine AS build
WORKDIR /app

# CRA incrusta las variables REACT_APP_* en el build estático — deben venir
# como build arg, no como env var en runtime (ya compilado, no sirve de nada
# cambiarlas después). Default apunta al backend dockerizado en la misma red.
ARG REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# COPY conserva los permisos originales de node:20-alpine (umask restrictivo
# en /app/build/static) — sin esto nginx (usuario no-root) no puede ni
# recorrer esa carpeta y sirve 403 en todo /static/*.
RUN chmod -R o+rX /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
