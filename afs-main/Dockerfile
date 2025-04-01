FROM node:20

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
# Install dependencies including dev dependencies
RUN npm install --production=false

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Command to run the application
CMD ["npm", "run", "start"]