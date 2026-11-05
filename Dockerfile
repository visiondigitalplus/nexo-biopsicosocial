FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# wget va incluido en alpine (healthcheck); curl no, por eso usamos wget.
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
# La app escucha en 0.0.0.0 dentro del contenedor; el host mapea el puerto.
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
# El esquema y la semilla se aplican solos al arrancar (idempotente).
CMD ["node", "server/index.js"]
