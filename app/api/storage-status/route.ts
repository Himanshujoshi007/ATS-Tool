import { storageConfigured } from '@/lib/mongodb';
export const dynamic = 'force-dynamic';
export function GET() { return Response.json({enabled:storageConfigured() && (process.env.ADMIN_TOKEN?.length || 0) >= 32},{headers:{'Cache-Control':'no-store'}}); }
