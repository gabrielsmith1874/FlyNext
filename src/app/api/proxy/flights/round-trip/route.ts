import { NextResponse } from 'next/server';

const API_KEY = "0da1159fbf062d8e8b4650679aa39a7aefbcb6b3f6a455a0acc7345b8fb65a05";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate');

    if (!origin || !destination || !departureDate || !returnDate) {
      return NextResponse.json(
        { error: 'Origin, destination, departure date, and return date are required' },
        { status: 400 }
      );
    }

    // Fetch outbound flights
    const outboundUrl = `https://advanced-flights-system.replit.app/api/flights?origin=${origin}&destination=${destination}&date=${departureDate}`;
    const outboundResponse = await fetch(outboundUrl, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    const outboundData = await outboundResponse.json();

    // Fetch return flights
    const returnUrl = `https://advanced-flights-system.replit.app/api/flights?origin=${destination}&destination=${origin}&date=${returnDate}`;
    const returnResponse = await fetch(returnUrl, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    const returnData = await returnResponse.json();

    const response = NextResponse.json({
      outbound: outboundData,
      return: returnData
    });
    
    // Set CORS header
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.error('Round-trip proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
