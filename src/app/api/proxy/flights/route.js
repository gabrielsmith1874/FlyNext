import { NextResponse } from 'next/server';
const API_KEY = process.env.NEXT_PUBLIC_AFS_API_KEY; // added API key

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');

    // Build the remote URL using the passed parameters
    const remoteUrl = `https://advanced-flights-system.replit.app/api/flights?origin=${origin}&destination=${destination}&date=${date}`;
    
    // Include the API key header
    const remoteResponse = await fetch(remoteUrl, {
      headers: {
        'x-api-key': API_KEY
      }
    });
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
