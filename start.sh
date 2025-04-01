#!/bin/bash

echo "Starting FlyNext and AFS systems with Docker..."
docker-compose up -d --build

echo "Systems are starting up. This may take a minute..."
echo "You can access FlyNext at http://localhost:3000"
echo "AFS API is running at http://localhost:3001"