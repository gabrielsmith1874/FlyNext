import { NextResponse } from 'next/server';

// Use environment variables to determine the API key and base URL
const API_KEY = process.env.AFS_API_KEY || '0da1159fbf062d8e8b4650679aa39a7aefbcb6b3f6a455a0acc7345b8fb65a05';
const BASE_URL = process.env.AFS_BASE_URL || 'http://localhost:3001';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');

    // Build the remote URL using the base URL from environment variables
    const remoteUrl = `${BASE_URL}/api/flights?origin=${origin}&destination=${destination}&date=${date}`;
    
    console.log(`Proxying request to: ${remoteUrl}`);
    
    // Include the API key header
    const remoteResponse = await fetch(remoteUrl, {
      headers: {
        'x-api-key': API_KEY,
      },
    });
    
    if (!remoteResponse.ok) {
      console.error(`AFS API error: ${remoteResponse.status} ${remoteResponse.statusText}`);
      return NextResponse.json(
        { error: `AFS API error: ${remoteResponse.status}` }, 
        { status: remoteResponse.status }
      );
    }
    
    const data = await remoteResponse.json();
    
    const response = NextResponse.json(data);
    // Set CORS header
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}