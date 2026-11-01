import type { ExtractResult } from './extractResume';
import { estimatePageCount } from './extractResume';
export type AuditItemStatus = 'pass' | 'fail';
export type AuditItem = { title: string; status: AuditItemStatus; lines: string[]; earned?: number; possible?: number };
export type AuditSections = { documentSynopsis: AuditItem[]; dataIdentification: AuditItem[]; lexicalAnalysis: AuditItem[]; semanticAnalysis: AuditItem[] };
export type FeedbackCard = { type: 'success' | 'error' | 'warning'; title: string; desc: string };
export type PdfSemanticCharts = { softLabels: string[]; hardLabels: string[]; softCount: number; hardCount: number; ratio: number; ratioInRange: boolean };
export type ScoreCategory = { name: string; earned: number; possible: number; explanation: string };
export type AuditReportPayload = { reportId: string; score: number; fileName: string; plainText: string; extractError: string | null; sections: AuditSections; feedback: FeedbackCard[]; pdfSemantic: PdfSemanticCharts; categories: ScoreCategory[]; wordCount: number; achievementCount: number; assessable: boolean };

const HARD = ['python','java','javascript','typescript','react','node.js','sql','aws','azure','docker','linux','git','c++','c#','go','rust','html','css','mongodb','postgresql','excel','tableau','power bi','matlab','autocad','figma','jira','agile','scrum','ci/cd','machine learning','tensorflow','pytorch','embedded c','autosar','rtos','can','spi','i2c','uart','verilog','firmware','salesforce','google analytics','seo','crm','patient care','hipaa','ehr','emr','medical coding','care coordination','epic','cerner','icd-10','budgeting','forecasting','accounting','recruitment','supply chain','inventory management','project management'];
const SOFT = ['leadership','communication','collaboration','teamwork','mentoring','coaching','negotiation','problem solving','problem-solving','stakeholder management','customer service'];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function skills(text: string, list: string[]) { return list.filter(skill => skill === 'go' ? /\b(?:Go(?!-)|[Gg]olang)\b/.test(text) : skill === 'can' ? /\bCAN\b/.test(text) : new RegExp(`(?<![a-z0-9+#])${escape(skill)}(?![a-z0-9+#])`, 'i').test(text)); }
const action = /\b(?:achieved|automated|built|created|delivered|developed|designed|decreased|improved|increased|implemented|led|managed|optimized|reduced|resolved|saved|supported|coordinated|streamlined|launched|maintained|integrated)\b/i;
const metric = /(?:\b\d+(?:[,.]\d+)*\s*(?:%|percent\b|users\b|patients\b|customers\b|hours\b|days\b|minutes\b|seconds\b|teams\b|projects\b|transactions\b|records\b|applications\b|devices\b|ms\b)|[$£€]\s*\d[\d,.]*)/i;
export function buildAuditReport(file: File, extracted: ExtractResult): AuditReportPayload {
  const text = extracted.plainText.trim();
  const words = text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  const wordCount = words.length;
  const assessable = !extracted.extractError && wordCount >= 50 && text.length >= 150;
  const chunks = [...new Set(text.split(/\n+|[•●▪]|(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean))];
  const achievements = chunks.filter(s => action.test(s) && metric.test(s));
  const actionCount = chunks.filter(s => action.test(s)).length;
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+\d{1,3}[\s.-]*)?(?:\(\d{3}\)|\b\d{3})[\s.-]*\d{3}[\s.-]*\d{4}\b/)?.[0];
  const education = /\b(?:education|academic qualifications)\b/i.test(text);
  const experience = /\b(?:experience|employment|work history)\b/i.test(text);
  const skillSection = /\b(?:skills|core competencies|expertise)\b/i.test(text);
  const dates = /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|\d{1,2}\/\d{4}|(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current))\b/i.test(text);
  const pages = extracted.pageCount ?? estimatePageCount(wordCount);
  const hard = skills(text, HARD);
  const soft = skills(text, SOFT);
  const pronouns = (text.match(/\b(?:I|me|my|mine|myself)\b/g) ?? []).length;
  const longChunks = chunks.filter(s => s.split(/\s+/).length > 60).length;
  const supported = /\.(pdf|docx)$/i.test(file.name);
  const lengthPoints = wordCount >= 250 && wordCount <= 1000 ? 5 : wordCount >= 150 && wordCount <= 1400 ? 3 : 0;
  const evidence = hard.filter(skill => chunks.some(s => action.test(s) && skills(s, [skill]).length > 0));
  const item = (title: string, earned: number, possible: number, reason: string, fix: string): AuditItem => ({ title, earned: assessable ? earned : 0, possible, status: assessable && earned === possible ? 'pass' : 'fail', lines: [assessable ? reason : 'Not assessed: insufficient readable text.', ...(earned < possible && assessable ? [fix] : [])] });
  const documentSynopsis = [
    item('Readable text', assessable ? 15 : 0, 15, `${wordCount} words extracted successfully.`, 'Upload a text-based PDF or DOCX; scanned pages need OCR.'),
    item('Document format', supported ? 3 : 1, 3, `${file.name.split('.').pop()?.toUpperCase()} document.`, 'Use PDF or DOCX for common application portals.'),
    item('Upload size', file.size <= 5 * 1024 * 1024 ? 2 : 0, 2, `${(file.size / 1024 / 1024).toFixed(2)} MB.`, 'Reduce large images to keep the file below 5 MB.'),
  ];
  const dataIdentification = [
    item('Email address', email ? 8 : 0, 8, email ? `Detected: ${email}` : 'No email address detected.', 'Place a professional email in the main document text.'),
    item('Phone number', phone ? 7 : 0, 7, phone ? `Detected: ${phone}` : 'No phone number detected.', 'Include a phone number with country code where relevant.'),
    item('Experience section', experience ? 7 : 0, 7, experience ? 'Experience heading detected.' : 'Experience heading not found.', 'Use Experience or Work History; relevant projects can support an early-career resume.'),
    item('Skills section', skillSection ? 5 : 0, 5, skillSection ? 'Skills heading detected.' : 'Skills heading not found.', 'Add a clearly labeled Skills section tailored to the role.'),
    item('Education section', education ? 3 : 0, 3, education ? 'Education heading detected.' : 'Education heading not found.', 'Add relevant qualifications under Education.'),
    item('Employment dates', dates ? 5 : 0, 5, dates ? 'Recognizable employment dates detected.' : 'No recognizable employment date pattern.', 'Use dates such as Jul 2022 - Present or 2020 - 2023.'),
  ];
  const lexicalAnalysis = [
    item('Resume length', lengthPoints, 5, `${wordCount} words; ${extracted.pageCount === null ? 'estimated ' : ''}${pages} page${pages === 1 ? '' : 's'}.`, 'Aim for focused content; 250–1,000 words is a useful starting range, depending on seniority.'),
    item('Concise writing', longChunks <= 2 && chunks.length >= 3 ? 3 : 1, 3, `${longChunks} passages exceed 60 words.`, 'Split dense passages into short, focused achievement bullets.'),
    item('Direct language', pronouns === 0 ? 2 : 1, 2, `${pronouns} first-person pronouns detected.`, 'Start bullets with action verbs instead of I or my.'),
  ];
  const impact = Math.min(15, achievements.length * 5);
  const verbs = Math.min(10, actionCount * 2);
  const semanticAnalysis = [
    item('Measurable achievements', impact, 15, `${achievements.length} passages combine an action with a result metric. Dates and phone numbers do not count.`, 'Add truthful outcomes: action + what changed + a relevant number. Example: Reduced processing time by 20%.'),
    item('Interpersonal evidence', soft.length ? 2 : 0, 2, soft.length ? `Detected: ${soft.join(', ')}.` : 'No interpersonal skill terms detected.', 'Describe collaboration or leadership in context rather than adding unsupported labels.'),
    item('Role skills', Math.min(4, hard.length), 4, hard.length ? `Detected examples: ${hard.join(', ')}.` : 'No skills from the supported vocabulary detected; specialist terms may be missed.', 'Name relevant tools, systems or methods. The vocabulary covers several fields but is not exhaustive.'),
    item('Skills in context', Math.min(4, evidence.length * 2), 4, `${evidence.length} recognized skills appear in action-oriented passages.`, 'Show how you applied tools or methods to deliver a result.'),
    item('Action-oriented writing', verbs, 10, `${actionCount} passages contain action verbs.`, 'Use specific verbs such as built, coordinated, improved or delivered.'),
  ];
  const sum = (items: AuditItem[]) => items.reduce((n, i) => n + (i.earned ?? 0), 0);
  const categories: ScoreCategory[] = [
    { name: 'Text & file', earned: sum(documentSynopsis), possible: 20, explanation: 'Readable content, supported format and upload size.' },
    { name: 'Contact details', earned: sum(dataIdentification.slice(0, 2)), possible: 15, explanation: 'A readable email and phone number.' },
    { name: 'Structure', earned: sum(dataIdentification.slice(2)), possible: 20, explanation: 'Experience, skills, education and recognizable dates.' },
    { name: 'Impact', earned: sum([semanticAnalysis[0], semanticAnalysis[4]]), possible: 25, explanation: 'Actions supported by measurable outcomes.' },
    { name: 'Clarity', earned: sum(lexicalAnalysis), possible: 10, explanation: 'Focused length, concise passages and direct language.' },
    { name: 'Skill evidence', earned: sum(semanticAnalysis.slice(1, 4)), possible: 10, explanation: 'Role skills, interpersonal terms and applied skill evidence.' },
  ];
  const score = categories.reduce((n, c) => n + c.earned, 0);
  const all = [...documentSynopsis, ...dataIdentification, ...lexicalAnalysis, ...semanticAnalysis];
  const priorities = all.filter(i => (i.earned ?? 0) < (i.possible ?? 0)).sort((a, b) => ((b.possible ?? 0) - (b.earned ?? 0)) - ((a.possible ?? 0) - (a.earned ?? 0)));
  const feedback: FeedbackCard[] = assessable ? priorities.slice(0, 3).map(i => ({ type: 'warning', title: i.title, desc: `${i.lines.join(' ')} (${i.earned}/${i.possible} points)` })) : [{ type: 'error', title: 'Readable text needed', desc: extracted.extractError || 'We need at least 50 readable words before calculating a useful audit.' }];
  if (assessable && !priorities.length) feedback.push({ type: 'success', title: 'Strong fundamentals', desc: 'All checks in this audit passed. Review the resume against each job description before applying.' });
  const ratio = soft.length ? hard.length / soft.length : hard.length;
  return { reportId: `RP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, score, fileName: file.name, plainText: text, extractError: extracted.extractError, assessable, wordCount, achievementCount: achievements.length, categories, sections: { documentSynopsis, dataIdentification, lexicalAnalysis, semanticAnalysis }, feedback, pdfSemantic: { softLabels: soft, hardLabels: hard, softCount: soft.length, hardCount: hard.length, ratio: Math.round(ratio * 100) / 100, ratioInRange: true } };
}
