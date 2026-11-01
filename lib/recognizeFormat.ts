export type FormatRecognition = {
  likelyMatch: boolean;
  score: number | null;
  readable: boolean;
  checks: { label: string; matched: boolean }[];
};

/** Matches format conventions, not authorship; never changes the audit score. */
export function recognizeFormat(fileName: string, plainText: string, extractError: string | null): FormatRecognition {
  const text = plainText.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const readable = !extractError && text.length >= 150;
  const parts = fileName.replace(/\.(pdf|docx|txt)$/i, '').trim().split(/\s+[-–—]\s+/);
  const name = parts[0] ?? '';
  const filenameMatches = parts.length === 2 && (name.match(/\p{L}[\p{L}.'’-]*/gu) ?? []).length >= 2 && /^[\p{L}\s.'’-]+$/u.test(name) && /\p{L}/u.test(parts[1]);
  const experienceIndex = text.search(/\b(?:professional|work)\s+experience\b/i);
  const experience = experienceIndex < 0 ? '' : text.slice(experienceIndex).split(/\b(?:education|certifications|personal projects)\b/i)[0];
  const project = /\bproject(?:\s+(?:name|title))?\s*[:–—-]\s*\S/i.test(experience) || /\b(?:developed|built|delivered|implemented|led|worked on)\b[^.!?]{0,160}\bproject\b/i.test(experience);
  const checks = [
    { label: 'Filename: full name - job title', matched: filenameMatches },
    { label: 'Summary section', matched: /\b(?:professional\s+)?summary\b/i.test(text) },
    { label: 'Technical Skills section', matched: /\btechnical\s+skills\b/i.test(text) },
    { label: 'Professional / Work Experience section', matched: experienceIndex >= 0 },
    { label: 'Project inside work experience', matched: project },
    { label: 'Technology Stack / Tech Stack label', matched: /\b(?:technology|tech)\s+stack\s*:/i.test(experience) },
    { label: 'Education section', matched: /\beducation\b/i.test(text) },
  ];
  const count = checks.filter(check => check.matched).length;
  const likelyMatch = readable && filenameMatches && project && experienceIndex >= 0 && count >= 4;
  return { checks, readable, likelyMatch, score: likelyMatch ? 85 + (count - 4) * 5 : null };
}
