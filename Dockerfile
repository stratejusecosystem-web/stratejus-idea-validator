FROM node:20-slim AS base
# Prisma needs openssl + CA certs at build and runtime.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install deps (incl. prisma CLI) and generate the client.
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY prisma ./prisma
RUN npx prisma generate

# App source.
COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "src/index.js"]
