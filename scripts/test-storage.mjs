import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
const root = new URL('../',import.meta.url);
const temp = new URL('../test-fixtures/storage-modules/',import.meta.url);
mkdirSync(temp,{recursive:true});
const files = ['lib/mongodb.ts','lib/submissions.ts','lib/extractResume.ts','lib/technicalAnalysis.ts','lib/auditAnalysis.ts','app/api/capture/route.ts','app/api/storage-status/route.ts','app/api/admin/resumes/route.ts','app/api/admin/resumes/[id]/route.ts'];
const target = path => new URL(path.replaceAll('/','_').replace('.ts','.mjs'),temp).href;
for(const path of files) {
 let js = ts.transpileModule(readFileSync(new URL(path,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 js=js.replace(/from ['"](@\/lib\/[^'"]+|\.\/extractResume|\.\/technicalAnalysis|mongodb)['"]/g,(_,name)=>`from ${JSON.stringify(name==='mongodb'?import.meta.resolve('mongodb'):target(name.startsWith('./')?'lib/'+name.slice(2)+'.ts':name.replace('@/','')+'.ts'))}`);
 writeFileSync(fileURLToPath(target(path)),js);
}
const server = await MongoMemoryServer.create();
process.env.MONGODB_URI=server.getUri();process.env.MONGODB_DB='ats_test';process.env.ADMIN_TOKEN='test-only-'+ 'x'.repeat(40);process.env.APP_ORIGIN='http://localhost:3100';
const {POST} = await import(target('app/api/capture/route.ts'));
const {GET:list} = await import(target('app/api/admin/resumes/route.ts'));
const {GET:download} = await import(target('app/api/admin/resumes/[id]/route.ts'));
const {csvCell,connectingIp} = await import(target('lib/submissions.ts'));
const {GET:storageStatus} = await import(target('app/api/storage-status/route.ts'));
const client=await new MongoClient(server.getUri()).connect();const db=client.db('ats_test');
const text=readFileSync(new URL('../test-fixtures/Alex Example - Embedded Developer.txt',import.meta.url),'utf8');
const file=new File([text],'Alex Example - Embedded Developer.txt');
function req(id=randomUUID(),consent='resume-review-v1',origin='http://localhost:3100',upload=file) {
 const body=new FormData();body.append('submissionId',id);body.append('consent',consent);body.append('text',text);body.append('resume',upload);
 return new Request('http://localhost:3100/api/capture',{method:'POST',body,headers:{Origin:origin,'x-nf-client-connection-ip':'192.0.2.1'}});
}
try {
 assert.equal((await (await storageStatus()).json()).enabled,true);
 const oldPlatform=process.env.VERCEL; process.env.VERCEL='1';
 assert.equal(connectingIp(new Request('https://example.test',{headers:{'x-forwarded-for':'192.0.2.10','x-nf-client-connection-ip':'spoofed'}})),'192.0.2.10');
 if(oldPlatform===undefined)delete process.env.VERCEL;else process.env.VERCEL=oldPlatform;
 assert.equal((await POST(req(randomUUID(),'no'))).status,400);
 assert.equal((await POST(req(randomUUID(),'resume-review-v1','https://other.example'))).status,403);
 assert.equal((await POST(req(randomUUID(),'resume-review-v1','http://localhost:3100',new File(['not a pdf'],'bad.pdf')))).status,400);
 assert.equal((await db.collection('ats_resumes').countDocuments()),0);
 const id=randomUUID();assert.equal((await POST(req(id))).status,201);
 assert.equal((await POST(req(id))).status,200);
 assert.equal((await db.collection('ats_resumes').countDocuments()),1);
 const saved=await db.collection('ats_resumes').findOne({submissionId:id});
 assert.equal(saved.email,'alex@example.com');assert.equal(saved.phone,'+1 (415) 555-0198');assert.equal(saved.file.buffer.toString(),text);assert.equal(saved.consentVersion,'resume-review-v1');
 assert.ok(saved.expiresAt.getTime()>Date.now()+89*86400000);
 assert.equal((await list(new Request('http://localhost:3100/api/admin/resumes'))).status,401);
 assert.equal((await download(new Request('http://localhost:3100/api/admin/resumes/'+id),{params:Promise.resolve({id})})).status,401);
 const auth={Authorization:`Bearer ${process.env.ADMIN_TOKEN}`};
 const admin=await list(new Request('http://localhost:3100/api/admin/resumes',{headers:auth}));const data=await admin.json();assert.equal(data.resumes.length,1);assert.equal(data.resumes[0].file,undefined);assert.equal(data.resumes[0].plainText,undefined);
 const csv=await list(new Request('http://localhost:3100/api/admin/resumes?format=csv',{headers:auth}));assert.ok((await csv.text()).includes('alex@example.com'));
 assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
 const binary=await download(new Request('http://localhost:3100/api/admin/resumes/'+id,{headers:auth}),{params:Promise.resolve({id})});assert.equal(await binary.text(),text);
 await db.collection('ats_resumes').updateOne({submissionId:id},{$set:{expiresAt:new Date(Date.now()-1000)}});
 assert.equal((await download(new Request('http://localhost:3100/api/admin/resumes/'+id,{headers:auth}),{params:Promise.resolve({id})})).status,404);
 for(let n=0;n<9;n++)assert.equal((await POST(req())).status,201);
 assert.equal((await POST(req())).status,429);
 const indexes=await db.collection('ats_resumes').indexes();assert.ok(indexes.some(i=>i.expireAfterSeconds===0));
 console.log('Storage integration passed: consent, origin, signatures, atomic saves, duplicate retries, private access, CSV, downloads, retention and rate limits.');
} finally {await client.close();await server.stop();}
process.exit(0);
