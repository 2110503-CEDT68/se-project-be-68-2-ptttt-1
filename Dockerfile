FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=5000

RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

USER node

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

EXPOSE 5000

CMD ["npm", "start"]
