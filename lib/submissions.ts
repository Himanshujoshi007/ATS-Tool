import { createHash, timingSafeEqual } from 'node:crypto';
export const MAX_RESUME_BYTES = 3 * 1024 * 1024;
export const CONSENT_VERSION = 'resume-review-v1';
export function authorized(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token.length < 32) return false;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  return timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(token).digest());
}
export function extractContact(text: string, fileName: string) {
  const lines = text.split(/\n/).map(s=>s.trim()).filter(Boolean);
  const header = lines.slice(0,5).find(s=>s.length < 90 && /^[\p{L}\s.'’-]+$/u.test(s) && s.split(/\s+/).length >= 2 && !/summary|experience|skills|education|resume/i.test(s));
  const educationStart = lines.findIndex(s=>/^(?:education|academic qualifications)\b/i.test(s));
  const educationLines: string[] = [];
  if (educationStart >= 0) {
    for (const line of lines.slice(educationStart,educationStart+9)) {
      if (educationLines.length && /^(?:experience|projects|certifications|technical skills|awards|publications)\b/i.test(line)) break;
      educationLines.push(line);
    }
  }
  return {
    name: header || fileName.replace(/\.[^.]+$/, '').split(/\s+[-–—]\s+/)[0].slice(0,90),
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '',
    phone: text.match(/(?:\+\d{1,3}[\s.-]*)?(?:\(\d{3}\)|\b\d{3})[\s.-]*\d{3}[\s.-]*\d{4}\b/)?.[0] || '',
    linkedin: text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i)?.[0] || '',
    education: educationLines.join('\n').slice(0,2000),
    metadataSource:'browser-extracted-unverified',
  };
}
export function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g,'""') + '"';
}
export function validSignature(bytes: Buffer, extension: string) {
  if(extension === 'pdf') return bytes.subarray(0,5).toString() === '%PDF-';
  if(extension === 'docx') return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return extension === 'txt' && !bytes.subarray(0,4096).includes(0);
}
