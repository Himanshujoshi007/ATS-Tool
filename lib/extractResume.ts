export type ExtractResult = {
  plainText: string;
  pageCount: number | null;
  extractError: string | null;
};

function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

async function extractPdf(file: File): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist');
  const buf = await file.arrayBuffer();
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

  const loadingTask = pdfjs.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  let full = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => ('str' in item ? item.str : '') || '');
    full += strings.join(' ') + '\n';
  }
  return { text: normalizeText(full), pages: pdf.numPages };
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return normalizeText(result.value);
}

export function fileTypeLabel(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf')) return 'PDF document';
  if (n.endsWith('.docx')) return 'Microsoft Word (DOCX) document';
  if (n.endsWith('.doc')) return 'Microsoft Word (DOC) document';
  if (n.endsWith('.txt')) return 'Plain text document';
  return file.type || 'Unknown file type';
}

/** Estimate pages for non-PDF when unknown */
export function estimatePageCount(wordCount: number): number {
  if (wordCount <= 0) return 1;
  return Math.min(5, Math.max(1, Math.ceil(wordCount / 450)));
}

export async function extractResumeFile(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.pdf')) {
      const { text, pages } = await extractPdf(file);
      return { plainText: text, pageCount: pages, extractError: null };
    }
    if (name.endsWith('.docx')) {
      const text = await extractDocx(file);
      return { plainText: text, pageCount: null, extractError: null };
    }
    if (name.endsWith('.txt')) {
      const text = normalizeText(await file.text());
      return { plainText: text, pageCount: null, extractError: null };
    }
    if (name.endsWith('.doc')) {
      return {
        plainText: '',
        pageCount: null,
        extractError:
          'Legacy .doc format could not be parsed in the browser. Please save as PDF or DOCX for a full audit.',
      };
    }
    return {
      plainText: '',
      pageCount: null,
      extractError: 'Unsupported file type for text extraction. Try PDF or DOCX.',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Extraction failed';
    return { plainText: '', pageCount: null, extractError: msg };
  }
}
