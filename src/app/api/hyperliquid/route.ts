import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple test response
    return NextResponse.json({
      message: "Hyperliquid API test endpoint",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to test Hyperliquid API"
    }, { status: 500 });
  }
}