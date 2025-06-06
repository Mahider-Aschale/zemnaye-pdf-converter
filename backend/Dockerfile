# Use official Node 20 image
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the application
COPY . .

# Build Next.js app
RUN npm run build

# Expose the default Next.js port
EXPOSE 3000

# Start Next.js app
CMD ["npm", "start"]
