FROM node:lts-alpine
ENV NODE_ENV production

RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

COPY package*.json ./

USER node

RUN npm install --production

RUN npm prune --production

COPY --chown=node:node . .

EXPOSE 389

CMD [ "npm", "start" ]