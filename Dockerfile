# Use a slim version of Node.js as the base image
FROM node:16-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# Set environment variable for Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"

# Set the working directory for your app
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json /app
RUN npm install

# Copy the rest of your application code
COPY . /app

# Run your app
CMD ["npm", "start"]
