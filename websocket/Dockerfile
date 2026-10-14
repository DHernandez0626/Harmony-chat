FROM node:24

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

ENV PORT=8001

EXPOSE 8001

CMD ["npm", "start"]
