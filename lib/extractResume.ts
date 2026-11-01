export type ExtractResult = {
  plainText: string;
  pageCount: number | null;
  extractError: string | null;
};
export type ExtractionProgress = { completed: number; total: number; label: string };
type ProgressCallback = (progress: ExtractionProgress) => void;

function normalizeText(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/[^\S\n]+/g, ' ').trim()).filter(Boolean).join('\n');
}

async function extractPdf(file: File, onProgress?: ProgressCallback): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist');
  const buf = await file.arrayBuffer();
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const loadingTask = pdfjs.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  let full = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let previousY: number | null = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5];
      if (previousY !== null && Math.abs(y - previousY) > 3) full += '\n';
      full += item.str + (item.hasEOL ? '\n' : ' ');
      previousY = y;
    }
    const annotations = await page.getAnnotations();
    for (const annotation of annotations) {
      if (annotation.subtype === 'Link' && typeof annotation.url === 'string' && /^(?:https?:\/\/(?:www\.)?linkedin\.com\/in\/|mailto:)/i.test(annotation.url)) {
        full += '\n' + annotation.url.replace(/^mailto:/i, '') + '\n';
      }
    }
    full += '\n';
    onProgress?.({completed:i,total:pdf.numPages,label:`PDF text layer · page ${i} of ${pdf.numPages}`});
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

export async function extractResumeFile(file: File, onProgress?: ProgressCallback): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.pdf')) {
      const { text, pages } = await extractPdf(file, onProgress);
      return { plainText: text, pageCount: pages, extractError: null };
    }
    if (name.endsWith('.docx')) {
      const text = await extractDocx(file);
      onProgress?.({completed:1,total:1,label:'DOCX text extraction complete'});
      return { plainText: text, pageCount: null, extractError: null };
    }
    if (name.endsWith('.txt')) {
      const text = normalizeText(await file.text());
      onProgress?.({completed:1,total:1,label:'Plain-text decoding complete'});
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
