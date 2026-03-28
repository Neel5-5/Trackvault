FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data

EXPOSE 3000

ENV DB_PATH=/app/data/events.db
ENV PORT=3000

CMD ["node", "index.js"]
