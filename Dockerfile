FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY lib ./lib
COPY public ./public
COPY server.js ./
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "server.js"]
