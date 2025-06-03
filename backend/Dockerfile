# Use an official Node.js image
FROM node:18

# Install LibreOffice
RUN apt-get update && apt-get install -y libreoffice

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Build the Next.js app (optional if you're using `app/` router or only API routes)
RUN npm run build

# Expose port
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "run", "start"]
