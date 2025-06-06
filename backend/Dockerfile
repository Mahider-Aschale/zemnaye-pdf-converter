# Use Node 20 with Debian
FROM node:20-bullseye

# Create app directory
WORKDIR /app

# Copy package files separately to cache dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the default port
EXPOSE 3000

# Start the app in production
CMD ["npm", "run", "start"]
