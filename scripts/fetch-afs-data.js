/**
 * Script to fetch data from AFS and store in database
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AFS_API_KEY = process.env.AFS_API_KEY;
const AFS_BASE_URL = process.env.AFS_BASE_URL;
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Make a request to the AFS API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} - API response
 */
async function makeRequest(endpoint) {
    try {
        console.log(`Making request to ${endpoint}...`);
        const controller = new AbortController();
        // Set timeout: 15s for /api/airlines, otherwise 5s
        const timeoutDuration = endpoint === '/api/airlines' ? 15000 : 5000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        const response = await fetch(`${AFS_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'x-api-key': AFS_API_KEY,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Request failed with status ${response.status}: ${response.statusText}`);
            console.error(`Response body: ${errorBody}`);
            throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Response from ${endpoint}:`, data);
        return data;
    } catch (error) {
        console.error(`Error making request to ${endpoint}:`, error.message, error.stack);
        throw error;
    }
}

/**
 * Fetch cities from AFS and store in database
 */
async function fetchCities() {
    console.log('Fetching cities from AFS...');
    const cities = await makeRequest('/api/cities');
    console.log(`Found ${cities.length} cities`);

    for (const city of cities) {
        const id = `${city.city}-${city.country}`.replace(/\s+/g, '-').toLowerCase();
        console.log('Upserting city:', city);
        await prisma.city.upsert({
            where: { id },
            update: {
                name: city.city,
                country: city.country
            },
            create: {
                id,
                name: city.city,
                country: city.country
            }
        });
    }

    console.log('Cities stored in database');
}

/**
 * Fetch airports from AFS and store in database
 */
async function fetchAirports() {
    try {
        console.log('Fetching airports from AFS...');
        const airports = await makeRequest('/api/airports');
        console.log(`Found ${airports.length} airports`);

        for (const airport of airports) {
            // Using string properties (from Postman response)
            const cityName = airport.city;
            const cityCountry = airport.country;
            const cityId = `${cityName}-${cityCountry}`.replace(/\s+/g, '-').toLowerCase();

            let city = await prisma.city.findUnique({
                where: { id: cityId }
            });

            if (!city) {
                city = await prisma.city.create({
                    data: {
                        id: cityId,
                        name: cityName,
                        country: cityCountry
                    }
                });
            }

            // Upsert airport
            await prisma.airport.upsert({
                where: { code: airport.code },
                update: {
                    name: airport.name,
                    cityId: city.id
                },
                create: {
                    id: airport.id,
                    code: airport.code,
                    name: airport.name,
                    cityId: city.id
                }
            });
        }
        console.log('Airports stored in database');
    } catch (error) {
        console.error('Failed to fetch airports:', error);
    }
}

/**
 * Fetch airlines from AFS and store in database
 */
async function fetchAirlines() {
    try {
        console.log('Fetching airlines from AFS...');
        const airlines = await makeRequest('/api/airlines');
        console.log(`Found ${airlines.length} airlines`);

        for (const airline of airlines) {
            // In the new API, the airline base data is provided under 'base'
            await prisma.airline.upsert({
                where: { code: airline.code },
                update: {
                    name: airline.name,
                    baseCode: airline.base.code
                },
                create: {
                    code: airline.code,
                    name: airline.name,
                    baseCode: airline.base.code
                }
            });
        }
        console.log('Airlines stored in database');
    } catch (error) {
        console.error('Failed to fetch airlines:', error);
    }
}

/**
 * Main function
 */
async function main() {
    try {
        await fetchCities();
        await fetchAirports();
        await fetchAirlines();

        console.log('Data fetched and stored successfully');
    } catch (error) {
        console.error('Failed to fetch data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run main function
main();