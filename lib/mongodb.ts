import { MongoClient } from 'mongodb';
let pending: Promise<MongoClient> | null = null;
export function storageConfigured() { return Boolean(process.env.MONGODB_URI || process.env.MONGO_URI); }
export async function getDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Storage is not configured');
  if (!pending) {
    const client = new MongoClient(uri, { maxPoolSize:5, minPoolSize:0, serverSelectionTimeoutMS:8000, connectTimeoutMS:8000, socketTimeoutMS:15000 });
    pending = client.connect().catch(async error => { pending = null; await client.close(); throw error; });
  }
  return (await pending).db(process.env.MONGODB_DB || 'resumepro');
}
export default getDatabase;
