# Use a Debian-based Node image
FROM node:18-bullseye

# Install LibreOffice + unoconv
RUN apt-get update && \
    apt-get install -y libreoffice unoconv && \
    apt-get clean

# Create app directory
WORKDIR /app

# Copy app files
COPY . .

# Install dependencies
RUN npm install

# Expose the default Next.js port
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "run", "start"]
