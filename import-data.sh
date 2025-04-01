#!/bin/bash

echo "Waiting for services to be ready..."
sleep 10

echo "Running AFS database migrations..."
docker-compose exec afs-main npx prisma migrate deploy

echo "Importing AFS data..."
docker-compose exec afs-main node prisma/data/import_data
docker-compose exec afs-main node prisma/data/generate_flights
docker-compose exec afs-main node prisma/data/import_agencies

echo "Running FlyNext database migrations..."
docker-compose exec flynext npx prisma migrate deploy
docker-compose exec flynext npx prisma db push

echo "Fetching data from AFS to FlyNext..."
docker-compose exec flynext node scripts/fetch-afs-data.js

echo "Data import complete!"