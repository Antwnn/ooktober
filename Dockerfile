FROM node:22-bookworm-slim

# System libraries Remotion's headless Chrome needs on Linux.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 \
    libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 \
    libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build the web tool (served by the Express server) and download Chrome
# at build time so the first render doesn't have to.
RUN npm run app:build && npx remotion browser ensure

ENV NODE_ENV=production
CMD ["npm", "run", "server"]
