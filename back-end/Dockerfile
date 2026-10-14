FROM node:24

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD ["npm", "start"]