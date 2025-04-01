# Use the official Node.js 20 image with Debian as the base image
FROM node:20

# Update and install OpenSSL 1.1
RUN apt-get update && apt-get install -y openssl libssl-dev

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Copy the Prisma schema file
COPY prisma ./prisma/

# Install dependencies including dev dependencies
RUN npm install --production=false

# Copy the rest of the application code to the working directory
COPY . .

# Generate the Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]