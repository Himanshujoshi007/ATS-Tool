import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      return NextResponse.json(
        { status: 'Failed', message: 'MONGO_URI is missing in .env.local' }, 
        { status: 500 }
      );
    }

    // Attempt to connect to the database
    await mongoose.connect(mongoUri);
    
    return NextResponse.json({ 
      status: 'Success', 
      message: 'Successfully connected to the MongoDB database!' 
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'Failed', message: 'Could not connect to MongoDB.', error: String(error) },
      { status: 500 }
    );
  }
}
