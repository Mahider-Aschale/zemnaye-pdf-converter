# Use official Node.js 20 image
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy package files first for better Docker caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the application files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose Next.js default port
EXPOSE 3000

# Start the Next.js app in production
CMD ["npm", "run", "start"]
