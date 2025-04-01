#!/bin/bash

echo "Starting local development setup..."

# Step 1: Set up AFS first
echo "====== Setting up AFS ======"

# Navigate to AFS directory
echo "Changing to AFS directory..."
cd afs-main

# Install AFS dependencies
echo "Installing AFS dependencies..."
npm install

# Migrate AFS database
echo "Migrating AFS database..."
npx prisma generate
npx prisma migrate deploy

# Import AFS data
echo "Importing AFS airports and airlines data..."
node prisma/data/import_data

echo "Generating AFS flights data..."
node prisma/data/generate_flights

echo "Creating agency users..."
# Note: Make sure to add student IDs to prisma/data/agencies.js first
node prisma/data/import_agencies

# Start AFS server in the background on port 3001
echo "Starting AFS server in the background on port 3001..."
PORT=3001 npm run dev &
AFS_PID=$!

# Give the server time to start
echo "Waiting for AFS server to start..."
sleep 10

# Return to FlyNext directory
cd ..

# Step 2: Set up FlyNext
echo "====== Setting up FlyNext ======"

# Install FlyNext dependencies
echo "Installing FlyNext dependencies..."
npm install

# Run FlyNext database migrations
echo "Running FlyNext database migrations..."
npx prisma generate
npx prisma db push

# Fetch data from AFS
echo "Fetching data from AFS..."
node scripts/fetch-afs-data.js

# Shutdown the AFS server
echo "Shutting down AFS server..."
kill $AFS_PID

echo "Setup complete!"
echo "To run AFS locally, use: cd afs-main && PORT=3001 npm run dev"
echo "To run FlyNext, use: npm run dev"