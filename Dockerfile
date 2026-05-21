
FROM node:25.6.1-alpine3.23
WORKDIR /app
COPY package.json package.json
COPY tsconfig.json tsconfig.json

RUN npm install
COPY /src /src
