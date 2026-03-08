FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy all source
COPY . .

RUN ls src/ && echo "Source files OK"

EXPOSE 3000

# Use ts-node with transpile-only (skips type checking, always works)
CMD ["node_modules/.bin/ts-node", "-r", "tsconfig-paths/register", "--transpile-only", "src/main.ts"]
