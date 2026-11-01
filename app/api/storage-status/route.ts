import { getDatabase, storageConfigured } from '@/lib/mongodb';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
let checkedAt = 0;
let ready: Promise<boolean> | null = null;
export async function GET() {
  if (!storageConfigured() || (process.env.ADMIN_TOKEN?.length || 0) < 32) return Response.json({enabled:false},{headers:{'Cache-Control':'no-store'}});
  if(!ready || Date.now()-checkedAt > 30000) {
    checkedAt=Date.now();
    ready=getDatabase().then(db=>db.command({ping:1})).then(()=>true).catch(()=>false);
  }
  return Response.json({enabled:await ready},{headers:{'Cache-Control':'no-store'}});
}
