#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Run database migrations
echo "Running database migrations..."
npx prisma generate
npx prisma db push

# Fetch data from AFS
echo "Fetching data from AFS..."
node scripts/fetch-afs-data.js

echo "Setup complete!"