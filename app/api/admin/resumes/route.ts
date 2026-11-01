import { getDatabase } from '@/lib/mongodb';
import { authorized, csvCell } from '@/lib/submissions';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
  try {
    const rows = await (await getDatabase()).collection('ats_resumes').find({expiresAt:{$gt:new Date()}},{projection:{file:0,plainText:0,digest:0}}).sort({createdAt:-1}).limit(1000).toArray();
    if(new URL(request.url).searchParams.get('format') === 'csv') {
      const fields = ['submissionId','name','email','phone','linkedin','education','fileName','score','createdAt','expiresAt'];
      const csv = [fields.map(csvCell).join(','),...rows.map(row=>fields.map(field=>csvCell(row[field])).join(','))].join('\r\n');
      return new Response('\uFEFF'+csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="resume-contacts.csv"','Cache-Control':'no-store'}});
    }
    return Response.json({resumes:rows,truncated:rows.length === 1000},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'Storage unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
