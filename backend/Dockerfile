# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app code
COPY . .

# Build the Next.js project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]
