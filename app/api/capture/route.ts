import { Binary, MongoServerError } from 'mongodb';
import { createHash, createHmac } from 'node:crypto';
import { getDatabase, storageConfigured } from '@/lib/mongodb';
import { CONSENT_VERSION, extractContact, MAX_RESUME_BYTES, validSignature } from '@/lib/submissions';
import { buildAuditReport } from '@/lib/auditAnalysis';
export const runtime = 'nodejs';
const json = (data: object, status = 200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== allowedOrigin) return json({error:'Invalid request origin.'},403);
  if (!storageConfigured() || !process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 32) return json({error:'Private storage is not available yet. Your audit still works; please try saving later.'},503);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json({error:'Expected a resume upload.'},400);
  const limit = MAX_RESUME_BYTES + 200_000;
  if (Number(request.headers.get('content-length')) > limit) return json({error:'Upload must be smaller than 3 MB.'},413);
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({error:'No upload received.'},400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if(part.done) break; length += part.value.length; if(length > limit) { await reader.cancel(); return json({error:'Upload must be smaller than 3 MB.'},413); } chunks.push(part.value); }
    const body = Buffer.concat(chunks);
    const form = await new Response(body,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
    if (form.get('consent') !== CONSENT_VERSION) return json({error:'Permission to save this resume is required.'},400);
    const file = form.get('resume'); const text = form.get('text'); const id = form.get('submissionId');
    if (!(file instanceof File) || typeof text !== 'string' || text.length > 100_000 || text.trim().length < 150 || typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) return json({error:'Invalid resume submission.'},400);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const bytes = Buffer.from(await file.arrayBuffer());
    if (file.size === 0 || file.size > MAX_RESUME_BYTES || !validSignature(bytes,extension)) return json({error:'Choose a valid PDF, DOCX or TXT smaller than 3 MB.'},400);
    const digest = createHash('sha256').update(bytes).update(text).digest('hex');
    const db = await getDatabase();
    const records = db.collection('ats_resumes');
    await records.createIndex({submissionId:1},{unique:true});
    await records.createIndex({expiresAt:1},{expireAfterSeconds:0});
    const existing = await records.findOne({submissionId:id},{projection:{digest:1}});
    if(existing) return existing.digest === digest ? json({saved:true,submissionId:id}) : json({error:'Submission ID conflict.'},409);
    const counters = db.collection<{_id:string; count:number; expiresAt:Date}>('ats_limits');
    await counters.createIndex({expiresAt:1},{expireAfterSeconds:0});
    // Netlify supplies its trusted connecting-IP header. Do not use client-controlled forwarded-for.
    const ip = request.headers.get('x-nf-client-connection-ip') || (process.env.NODE_ENV === 'development' ? 'development' : 'unknown');
    const ipHash = createHmac('sha256',process.env.ADMIN_TOKEN!).update(ip).digest('hex');
    const hour = new Date().toISOString().slice(0,13);
    const day = hour.slice(0,10);
    for (const [key,max] of [[`ip:${ipHash}:${hour}`,10],[`day:${day}`,100]] as const) {
      try { await counters.updateOne({_id:key,count:{$lt:max}},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(Date.now()+2*86400000)}},{upsert:true}); }
      catch(e) { if(e instanceof MongoServerError && e.code === 11000) return json({error:'Save limit reached. Please try later.'},429); throw e; }
    }
    const report = buildAuditReport(file,{plainText:text,pageCount:null,extractError:null});
    const record = { submissionId:id,digest,...extractContact(text,file.name),fileName:file.name.slice(0,200),contentType:extension === 'pdf' ? 'application/pdf' : extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain',size:file.size,file:new Binary(bytes),plainText:text,score:report.score,consentVersion:CONSENT_VERSION,consentedAt:new Date(),createdAt:new Date(),expiresAt:new Date(Date.now()+90*86400000) };
    try { await records.insertOne(record); }
    catch(e) { if (!(e instanceof MongoServerError && e.code === 11000 && (await records.findOne({submissionId:id},{projection:{digest:1}}))?.digest === digest)) throw e; }
    return json({saved:true,submissionId:id},201);
  } catch { console.error('Resume storage request failed; no candidate details logged.'); return json({error:'Your resume was not confirmed saved. Retry while this page is open.'},503); }
}
