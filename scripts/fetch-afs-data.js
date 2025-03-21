/**
 * Script to fetch data from AFS and store in database
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// AFS API configuration
const AFS_API_KEY = process.env.AFS_API_KEY;
const AFS_BASE_URL = process.env.AFS_BASE_URL;

/**
 * Make a request to the AFS API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} - API response
 */
async function makeRequest(endpoint) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': AFS_API_KEY
    };

    const response = await fetch(`${AFS_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AFS API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AFS API request failed:', error);
    throw error;
  }
}

/**
 * Fetch cities from AFS and store in database
 */
async function fetchCities() {
  try {
    console.log('Fetching cities from AFS...');
    const cities = await makeRequest('/api/cities');
    
    console.log(`Found ${cities.length} cities`);
    
    // Create cities in database
    for (const city of cities) {
      await prisma.city.upsert({
        where: {
          id: `${city.city}-${city.country}`.replace(/\s+/g, '-').toLowerCase()
        },
        update: {
          name: city.city,
          country: city.country
        },
        create: {
          id: `${city.city}-${city.country}`.replace(/\s+/g, '-').toLowerCase(),
          name: city.city,
          country: city.country
        }
      });
    }
    
    console.log('Cities stored in database');
  } catch (error) {
    console.error('Failed to fetch cities:', error);
  }
}

/**
 * Fetch airports from AFS and store in database
 */
async function fetchAirports() {
  try {
    console.log('Fetching airports from AFS...');
    const airports = await makeRequest('/api/airports');
    
    console.log(`Found ${airports.length} airports`);
    
    // Create airports in database
    for (const airport of airports) {
      // Find or create city
      const cityId = `${airport.city}-${airport.country}`.replace(/\s+/g, '-').toLowerCase();
      
      let city = await prisma.city.findUnique({
        where: { id: cityId }
      });
      
      if (!city) {
        city = await prisma.city.create({
          data: {
            id: cityId,
            name: airport.city,
            country: airport.country
          }
        });
      }
      
      // Create airport
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
    
    // Create airlines in database
    for (const airline of airlines) {
      await prisma.airline.upsert({
        where: { code: airline.code },
        update: {
          name: airline.name,
          baseCode: airline.base?.code
        },
        create: {
          code: airline.code,
          name: airline.name,
          baseCode: airline.base?.code
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