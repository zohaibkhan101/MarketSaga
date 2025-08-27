FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i || true
COPY . .
RUN npm run build || true
EXPOSE 3000
CMD ["npm","start"]
