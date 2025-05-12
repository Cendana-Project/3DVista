# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any dependencies
RUN npm i

# Copy the application source code to the working directory
COPY . .

# Make the application available from outside this container
EXPOSE 3000

# Run the application using Node.js
CMD [ "node", "server.js" ]
