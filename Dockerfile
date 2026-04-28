FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8000

RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

USER node

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

EXPOSE 8000

CMD ["npm", "start"]
