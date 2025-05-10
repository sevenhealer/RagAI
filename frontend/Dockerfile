# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY rag-frontend/package.json rag-frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install

# Copy all frontend files
COPY rag-frontend .

# Build Next.js app
RUN pnpm build

# Expose frontend port
EXPOSE 3000

# Start Next.js app
CMD ["pnpm", "start"]