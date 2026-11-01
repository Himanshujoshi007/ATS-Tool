import { getDatabase } from '@/lib/mongodb';
import { authorized } from '@/lib/submissions';
export const runtime = 'nodejs';
export async function GET(request: Request, context: {params:Promise<{id:string}>}) {
  if(!authorized(request)) return Response.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
  try {
    const {id} = await context.params;
    const row = await (await getDatabase()).collection('ats_resumes').findOne({submissionId:id,expiresAt:{$gt:new Date()}});
    if(!row) return Response.json({error:'Not found'},{status:404,headers:{'Cache-Control':'no-store'}});
    return new Response(new Uint8Array(row.file.buffer),{headers:{'Content-Type':row.contentType,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  } catch { return Response.json({error:'Storage unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
