FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./ 2>/dev/null || true
RUN npm i || true
COPY . .
RUN npm run build || true
EXPOSE 3000
CMD ["npm","start"]
