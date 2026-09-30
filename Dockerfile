FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip chromium ca-certificates && rm -rf /var/lib/apt/lists/* \
 && pip3 install --break-system-packages --no-cache-dir yt-dlp
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/.wwebjs_auth /app/data
CMD ["npm", "start"]
