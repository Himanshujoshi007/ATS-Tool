import type { ExtractResult } from './extractResume';
import { estimatePageCount, fileTypeLabel } from './extractResume';

export type AuditItemStatus = 'pass' | 'fail';

export type AuditItem = {
  title: string;
  status: AuditItemStatus;
  lines: string[];
};

export type AuditSections = {
  documentSynopsis: AuditItem[];
  dataIdentification: AuditItem[];
  lexicalAnalysis: AuditItem[];
  semanticAnalysis: AuditItem[];
};

export type FeedbackCard = {
  type: 'success' | 'error' | 'warning';
  title: string;
  desc: string;
};

/** Data for PDF visuals (skill chips + donut chart) */
export type PdfSemanticCharts = {
  softLabels: string[];
  hardLabels: string[];
  softCount: number;
  hardCount: number;
  ratio: number;
  ratioInRange: boolean;
};

export type AuditReportPayload = {
  reportId: string;
  score: number;
  fileName: string;
  plainText: string;
  extractError: string | null;
  sections: AuditSections;
  feedback: FeedbackCard[];
  pdfSemantic: PdfSemanticCharts;
};

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'your', 'our', 'their', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'us',
]);

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'collaboration', 'problem solving', 'problem-solving',
  'adaptability', 'creativity', 'time management', 'organization', 'detail oriented', 'detailed',
  'reliable', 'thorough', 'motivated', 'dedicated', 'interpersonal', 'empathy', 'negotiation',
  'presentation', 'mentoring', 'coaching', 'conflict resolution', 'customer service', 'multitasking',
];

const HARD_SKILLS = [
  'python', 'java', 'javascript', 'typescript', 'react', 'node', 'nodejs', 'sql', 'aws', 'azure',
  'gcp', 'kubernetes', 'docker', 'linux', 'git', 'c++', 'c#', 'go', 'rust', 'swift', 'kotlin',
  'scala', 'ruby', 'php', 'html', 'css', 'angular', 'vue', 'django', 'flask', 'spring', 'mongodb',
  'postgresql', 'mysql', 'redis', 'tensorflow', 'pytorch', 'spark', 'hadoop', 'tableau', 'power bi',
  'excel', 'verilog', 'scheme', 'matlab', 'solidworks', 'autocad', 'figma', 'jira', 'agile', 'scrum',
  'devops', 'ci/cd', 'terraform', 'ansible', 'graphql', 'rest', 'api', 'microservices', 'engineering',
  'machine learning', 'deep learning', 'nlp', 'computer vision', 'blockchain', 'security', 'networking',
];

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const vowels = w.match(/[aeiouy]+/g);
  let n = vowels ? vowels.length : 1;
  if (w.endsWith('e')) n -= 1;
  return Math.max(1, n);
}

function fleschReadingEase(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (sentences.length === 0 || words.length === 0) return 30;
  const avgSentenceLen = words.length / sentences.length;
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0);
  const avgSylPerWord = syllables / words.length;
  return 206.835 - 1.015 * avgSentenceLen - 84.6 * avgSylPerWord;
}

/** Map Flesch 0-100 to 1-10 scale (higher = easier to read, user example ~5.1) */
function readingLevelScore(text: string): number {
  const ease = fleschReadingEase(text);
  const clamped = Math.max(0, Math.min(100, ease));
  const scaled = 1 + (clamped / 100) * 9;
  return Math.round(scaled * 10) / 10;
}

function vocabularyLevelScore(words: string[]): number {
  if (words.length === 0) return 5;
  const avgLen =
    words.reduce((a, w) => a + w.replace(/[^a-zA-Z]/g, '').length, 0) / words.length;
  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))).size;
  const diversity = unique / words.length;
  const lenScore = Math.min(10, Math.max(1, (avgLen - 3) * 1.2 + diversity * 5));
  return Math.round(lenScore * 10) / 10;
}

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zA-Z0-9+.#]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function topFrequentWords(text: string, n: number): string[] {
  const words = tokenizeWords(text);
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

function concatWordsLikeExample(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function detectPhone(text: string): string | null {
  const patterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /\+\d{1,3}[-.\s]?\d{6,14}\b/g,
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[0]) return m[0].trim();
  }
  return null;
}

function detectEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function detectLinkedIn(text: string): string | null {
  const m = text.match(/linkedin\.com\/(in|pub|school|company)\/[\w-]+/i);
  return m ? `https://www.${m[0]}` : null;
}

function hasSection(text: string, patterns: RegExp[]): boolean {
  const t = text.toLowerCase();
  return patterns.some((p) => p.test(t));
}

function hasConventionalDates(text: string): boolean {
  const pats = [
    /\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,']+\d{4}\b/i,
    /\b\d{1,2}\/\d{4}\b/,
    /\b(19|20)\d{2}\s*[-–]\s*(present|current|now)\b/i,
  ];
  let hits = 0;
  for (const p of pats) {
    if (p.test(text)) hits++;
  }
  return hits >= 2;
}

function countPersonalPronouns(text: string): number {
  const re = /\b(I|me|my|mine|myself|we|us|our|ours|ourselves)\b/gi;
  return [...text.matchAll(re)].length;
}

function countNumericized(text: string): number {
  const patterns = [
    /\d+\s*%/g,
    /\$\s*\d[\d,]*/g,
    /\b\d{1,3}\s*(k|m|b)\b/gi,
    /\b\d+%\b/g,
    /\bincreased\b.*\d/gi,
    /\breduced\b.*\d/gi,
  ];
  let n = 0;
  for (const p of patterns) {
    const m = text.match(p);
    if (m) n += m.length;
  }
  return n;
}

function countMeasurableAchievements(text: string): number {
  const lines = text.split(/[\n•·\-–]/);
  let c = 0;
  for (const line of lines) {
    if (/\d/.test(line) && (/%|\$|percent|million|thousand|users|revenue|growth/i.test(line) || /\d{2,}/.test(line))) {
      c++;
    }
  }
  return c;
}

function findSoftSkills(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  for (const s of SOFT_SKILLS) {
    if (t.includes(s)) found.push(s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  }
  return [...new Set(found)];
}

function findHardSkills(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  for (const s of HARD_SKILLS) {
    const needle = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${needle}\\b`, 'i').test(t)) {
      found.push(s.charAt(0).toUpperCase() + s.slice(1));
    }
  }
  return [...new Set(found)];
}

function formatKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function reportFingerprint(file: File): number {
  const fp = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < fp.length; i++) {
    hash = (hash << 5) - hash + fp.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function buildAuditReport(
  file: File,
  extracted: ExtractResult
): AuditReportPayload {
  const text = extracted.plainText;
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  const wordCount = words.length;
  const reportId = `NEURAL-${reportFingerprint(file).toString(16).toUpperCase().slice(0, 8)}`;

  const pageCount =
    extracted.pageCount ?? estimatePageCount(wordCount);

  const fileType = fileTypeLabel(file);
  const sizeKb = formatKb(file.size);

  const atsOk =
    text.length > 150 &&
    (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx'));

  const phone = detectPhone(text);
  const email = detectEmail(text);
  const linkedin = detectLinkedIn(text);

  const hasEducation = hasSection(text, [/\beducation\b/, /\bacademic\b/, /\buniversity\b/, /\bdegree\b/]);
  const hasWork = hasSection(text, [
    /\bexperience\b/,
    /\bemployment\b/,
    /\bwork history\b/,
    /\bprofessional experience\b/,
  ]);
  const hasSkills = hasSection(text, [
    /\bskills\b/,
    /\bachievements\b/,
    /\btechnical skills\b/,
    /\bcore competencies\b/,
  ]);

  const pronounCount = countPersonalPronouns(text);
  const numericHits = countNumericized(text);
  const vocabLevel = vocabularyLevelScore(words);
  const readLevel = readingLevelScore(text);
  const topWords = topFrequentWords(text, 5);
  const topWordsDisplay = topWords.length ? concatWordsLikeExample(topWords) : 'N/A';

  const measurable = countMeasurableAchievements(text);
  const softFound = findSoftSkills(text);
  const hardFound = findHardSkills(text);
  const softSkillsDisplay = softFound.length ? concatWordsLikeExample(softFound) : 'None detected';
  const hardSkillsDisplay = hardFound.length ? concatWordsLikeExample(hardFound) : 'None detected';

  const ratio =
    softFound.length > 0 ? Math.round((hardFound.length / softFound.length) * 100) / 100 : hardFound.length;

  const documentSynopsis: AuditItem[] = [
    {
      title: 'ATS Compliance',
      status: atsOk && !extracted.extractError ? 'pass' : 'fail',
      lines:
        atsOk && !extracted.extractError
          ? ['Your resume appears to be compliant with applicant tracking systems. Awesome!']
          : [
              extracted.extractError ||
                'We could not fully verify ATS compatibility. Ensure you use standard PDF or DOCX with selectable text.',
            ],
    },
    {
      title: 'File Type',
      status: 'pass',
      lines: [
        `The file type of your resume is: ${fileType}.`,
        file.name.toLowerCase().match(/\.(pdf|docx)$/)
          ? 'This is one of the standard file types used for resumes. Great!'
          : 'For best ATS results, prefer PDF or DOCX.',
      ],
    },
    {
      title: 'File Size',
      status: file.size < 600 * 1024 ? 'pass' : 'fail',
      lines: [
        `The file size of your resume is: ${sizeKb}`,
        file.size < 600 * 1024
          ? 'This is small enough to likely avoid any transmission issues.'
          : 'This file is on the large side; consider compressing images for easier uploads.',
      ],
    },
    {
      title: 'Page Count',
      status: pageCount <= 2 ? 'pass' : 'fail',
      lines: [
        extracted.pageCount != null
          ? `Your resume contains ${pageCount} page${pageCount === 1 ? '' : 's'}.`
          : `Your resume is estimated at about ${pageCount} page${pageCount === 1 ? '' : 's'} (based on length).`,
        pageCount <= 2
          ? 'Great job! This matches the page count of the most effective resumes.'
          : 'Many recruiters prefer 1–2 pages; consider tightening content if possible.',
      ],
    },
    {
      title: 'Word Count',
      status: wordCount >= 350 && wordCount <= 900 ? 'pass' : wordCount > 0 ? 'fail' : 'fail',
      lines: [
        `Your resume contains ${wordCount} word${wordCount === 1 ? '' : 's'}.`,
        wordCount === 0
          ? 'No extractable text was found. Try another file format or a text-based PDF.'
          : wordCount >= 350 && wordCount <= 900
            ? 'Great job! This matches the word count of the most effective resumes.'
            : 'Ideal length is often roughly 400–800 words; adjust if needed.',
      ],
    },
  ];

  const dataIdentification: AuditItem[] = [
    {
      title: 'Phone Number',
      status: phone ? 'pass' : 'fail',
      lines: phone
        ? [
            `We have successfully detected your phone number on your resume as: ${phone}`,
            'If this is not your phone number, then you may be using an ATS-incompatible resume template or a strangely-formatted phone number.',
          ]
        : [
            'We were unable to detect a clear phone number on your resume.',
            'Add a standard phone format so employers and ATS tools can reach you.',
          ],
    },
    {
      title: 'E-mail Address',
      status: email ? 'pass' : 'fail',
      lines: email
        ? [
            `We have successfully detected your e-mail address on your resume as: ${email}`,
            'If this is not your e-mail address, then you may be using an ATS-incompatible resume template.',
          ]
        : [
            'We were unable to detect an e-mail address on your resume.',
            'Include a professional email in plain text for ATS parsers.',
          ],
    },
    {
      title: 'LinkedIn URL',
      status: linkedin ? 'pass' : 'fail',
      lines: linkedin
        ? [
            `We have successfully detected your LinkedIn profile reference: ${linkedin}`,
            'Great — recruiters often look for a LinkedIn link.',
          ]
        : [
            'Oh no! We were unable to detect the URL to your LinkedIn profile on your resume.',
            "It's important to include this on your resume so that potential employers can see that you're taking your career and job search seriously. If you did include the URL to your LinkedIn profile on your resume, then you may be using an ATS-incompatible resume template.",
          ],
    },
    {
      title: 'Education',
      status: hasEducation ? 'pass' : 'fail',
      lines: hasEducation
        ? ['We have successfully detected an Education section on your resume. Fantastic!']
        : [
            'We could not clearly detect an Education section.',
            'Add a clearly labeled Education heading with institutions and dates.',
          ],
    },
    {
      title: 'Work History',
      status: hasWork ? 'pass' : 'fail',
      lines: hasWork
        ? ['We have successfully detected a Work History section on your resume. Awesome!']
        : [
            'We could not clearly detect a Work History / Experience section.',
            'Use standard headings like Experience or Work History.',
          ],
    },
    {
      title: 'Skills / Achievements',
      status: hasSkills ? 'pass' : 'fail',
      lines: hasSkills
        ? ['We have successfully detected a Skills/Achievements section on your resume. Superb!']
        : [
            'We could not clearly detect a Skills or Achievements section.',
            'Consider a dedicated Skills area with relevant keywords.',
          ],
    },
    {
      title: 'Date Formatting',
      status: hasConventionalDates(text) ? 'pass' : 'fail',
      lines: hasConventionalDates(text)
        ? ['The dates on your resume appear to be formatted in a conventional manner. Great!']
        : [
            'Date patterns were not clearly conventional (e.g. month/year ranges).',
            'Use consistent formats such as Jan 2022 – Present or 2020 – 2023.',
          ],
    },
  ];

  const lexicalAnalysis: AuditItem[] = [
    {
      title: 'Personal Pronouns',
      status: pronounCount === 0 ? 'pass' : 'fail',
      lines:
        pronounCount === 0
          ? ['We did not detect any personal pronouns on your resume. Perfect job!']
          : [
              `We detected ${pronounCount} personal pronoun instance(s). Resumes usually avoid I/me/my for a more professional tone.`,
            ],
    },
    {
      title: 'Numericized Data',
      status: numericHits >= 3 ? 'pass' : 'fail',
      lines:
        numericHits >= 3
          ? ["You've done your due diligence to numericize your results. Good stuff!"]
          : [
              'Add more quantified outcomes (%, $, metrics) in your bullets to strengthen impact.',
            ],
    },
    {
      title: 'Vocabulary Level',
      status: 'pass',
      lines: [
        `The vocabulary level on your resume is a ${vocabLevel} out of 10. Magnificent!`,
      ],
    },
    {
      title: 'Reading Level',
      status: 'pass',
      lines: [
        `The reading level on your resume is a ${readLevel} out of 10. Magnificent!`,
      ],
    },
    {
      title: 'Common Words',
      status: topWords.length ? 'pass' : 'fail',
      lines: topWords.length
        ? [
            'The following are some of the most frequently-used words on your resume:',
            topWordsDisplay,
            'Each of these words appear in your resume multiple times, which is a good thing! The words that appear the most often on your resume should help represent the archetype you are attempting to take on as a job seeker.',
          ]
        : ['Not enough repeated keywords detected to analyze common words.'],
    },
  ];

  const semanticAnalysis: AuditItem[] = [
    {
      title: 'Measurable Achievements',
      status: measurable >= 3 ? 'pass' : 'fail',
      lines: [
        `Your resume contains around ${measurable} measurable achievements.`,
        measurable >= 3
          ? 'Strong use of quantified results.'
          : 'This is on the low end, so we recommend including more bullet points numerically quantifying your contributions at past jobs.',
      ],
    },
    {
      title: 'Soft Skills',
      status: softFound.length >= 4 ? 'pass' : 'fail',
      lines: [
        'The following are some of the soft skills listed on your resume (not all skills may be listed):',
        softSkillsDisplay,
        `Your resume contains a total of around ${softFound.length} soft skills.`,
        softFound.length >= 4
          ? 'Good coverage of interpersonal strengths.'
          : "This is on the low end, so we'd recommend adding a few more soft skills on your resume.",
      ],
    },
    {
      title: 'Hard Skills',
      status: hardFound.length >= 5 ? 'pass' : 'fail',
      lines: [
        'The following are some of the hard skills listed on your resume (not all skills may be listed):',
        hardSkillsDisplay,
        `Your resume contains a total of around ${hardFound.length} hard skills.`,
        hardFound.length >= 5
          ? 'Solid technical keyword coverage.'
          : "This is on the low end, so we'd recommend adding a few more hard skills on your resume.",
      ],
    },
    {
      title: 'Skills Efficiency Ratio',
      status: ratio >= 1 && ratio <= 2.5 ? 'pass' : 'fail',
      lines: [
        `The skills efficiency ratio of your resume is ${ratio}.`,
        ratio >= 1 && ratio <= 2.5 ? 'Fabulous!' : 'Consider balancing technical depth with interpersonal strengths.',
      ],
    },
  ];

  const passCount = [
    ...documentSynopsis,
    ...dataIdentification,
    ...lexicalAnalysis,
    ...semanticAnalysis,
  ].filter((i) => i.status === 'pass').length;
  const total = documentSynopsis.length + dataIdentification.length + lexicalAnalysis.length + semanticAnalysis.length;
  const score = Math.min(100, Math.round((passCount / total) * 100));

  const card = (status: AuditItemStatus, title: string, desc: string): FeedbackCard => ({
    type: status === 'pass' ? 'success' : 'error',
    title,
    desc,
  });

  const feedback: FeedbackCard[] = [
    card(documentSynopsis[0].status, documentSynopsis[0].title, documentSynopsis[0].lines[0] ?? ''),
    card(dataIdentification[1].status, dataIdentification[1].title, dataIdentification[1].lines[0] ?? ''),
    {
      type: semanticAnalysis[0].status === 'pass' ? 'success' : 'warning',
      title: semanticAnalysis[0].title,
      desc: semanticAnalysis[0].lines.slice(0, 2).join(' '),
    },
  ];

  return {
    reportId,
    score,
    fileName: file.name,
    plainText: text,
    extractError: extracted.extractError,
    sections: {
      documentSynopsis,
      dataIdentification,
      lexicalAnalysis,
      semanticAnalysis,
    },
    feedback,
    pdfSemantic: {
      softLabels: softFound.length ? softFound : ['None detected'],
      hardLabels: hardFound.length ? hardFound : ['None detected'],
      softCount: softFound.length,
      hardCount: hardFound.length,
      ratio,
      ratioInRange: ratio >= 1 && ratio <= 2.5,
    },
  };
}
