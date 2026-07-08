FROM node:25.6.1-alpine3.23
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm install
COPY src/ src/
COPY assets/ assets/
RUN npm run build
CMD ["node", "dist/index.js"]
