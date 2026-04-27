import { GState, jsPDF } from 'jspdf';
import type { AuditItem, AuditReportPayload } from './auditAnalysis';

const MARGIN = 18;
const PAGE_W = 210;
const MAX_W = PAGE_W - MARGIN * 2;
const LINE = 5;
const FOOTER_Y = 285;

/** Layout: help icon | title | status | body (screenshot-style) */
const COL_HELP = MARGIN + 4;
const COL_TITLE = MARGIN + 12;
const COL_STATUS = MARGIN + 46;
const CONTENT_X = MARGIN + 56;
const CONTENT_W = PAGE_W - MARGIN - CONTENT_X;

const C_BLUE_HELP = [94, 106, 210] as const;
const C_BLUE_TITLE = [42, 55, 120] as const;
const C_BLUE_BOX = [91, 105, 208] as const;
const C_GREY_BODY = [100, 100, 110] as const;
const C_RED_X = [220, 53, 69] as const;
const C_GREEN_OK = [40, 180, 90] as const;
const C_LINE = [220, 224, 230] as const;

const HARD_DONUT = '#5E6AD2';
const SOFT_DONUT = '#82B1F5';

const ATS_ENGINE_LABEL = 'ATS-X Enterprise v5.4.2';
const PAGE_H = 297;

function drawAtomicWatermark(doc: jsPDF, generatedAt: string): void {
  const lines = [
    `Generated: ${generatedAt}`,
    'Prepared By:',
    'Himanshu Joshi',
    'Anupam Charan Pahari',
    'Organization: Atomic Support',
  ];
  doc.saveGraphicsState();
  doc.setGState(new GState({ opacity: 0.75 }));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(150, 152, 160);
  const cx = PAGE_W / 2;
  const cy = PAGE_H / 2;
  const lineStep = 8.5;
  const n = lines.length;
  const firstBaselineY = cy - ((n - 1) * lineStep) / 2;
  lines.forEach((line, i) => {
    doc.text(line, cx, firstBaselineY + i * lineStep, {
      align: 'center',
      baseline: 'middle',
    });
  });
  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
}

function applyWatermarkToAllPages(doc: jsPDF, generatedAt: string): void {
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    drawAtomicWatermark(doc, generatedAt);
  }
}

function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need > FOOTER_Y - 12) {
    doc.addPage();
    return MARGIN + 10;
  }
  return y;
}

function drawHelpIcon(doc: jsPDF, cx: number, cy: number): void {
  doc.setFillColor(C_BLUE_HELP[0], C_BLUE_HELP[1], C_BLUE_HELP[2]);
  doc.circle(cx, cy, 3.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('?', cx, cy + 1.3, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
}

function drawStatusLarge(doc: jsPDF, x: number, y: number, pass: boolean): void {
  doc.setFont('helvetica', 'bold');
  if (pass) {
    doc.setTextColor(C_GREEN_OK[0], C_GREEN_OK[1], C_GREEN_OK[2]);
    doc.setFontSize(16);
    doc.text('\u2713', x, y + 4);
  } else {
    doc.setTextColor(C_RED_X[0], C_RED_X[1], C_RED_X[2]);
    doc.setFontSize(18);
    doc.text('\u2717', x, y + 4);
  }
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
}

function drawSkillBoxes(doc: jsPDF, startY: number, labels: string[]): number {
  let x = CONTENT_X;
  let rowTop = startY;
  const boxH = 7;
  const padX = 3;
  const gap = 2;
  const radius = 1.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  for (const raw of labels) {
    const label = raw.length > 42 ? `${raw.slice(0, 40)}…` : raw;
    const tw = doc.getTextWidth(label);
    const w = Math.min(Math.max(tw + padX * 2, 18), CONTENT_W);

    if (x + w > PAGE_W - MARGIN) {
      x = CONTENT_X;
      rowTop += boxH + gap;
      rowTop = ensureSpace(doc, rowTop, boxH + 6);
    }

    doc.setFillColor(C_BLUE_BOX[0], C_BLUE_BOX[1], C_BLUE_BOX[2]);
    doc.roundedRect(x, rowTop, w, boxH, radius, radius, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, x + w / 2, rowTop + boxH / 2 + 1.2, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    x += w + gap;
  }

  doc.setFont('helvetica', 'normal');
  return rowTop + boxH + 4;
}

function createDonutChartDataUrl(hardCount: number, softCount: number): string | null {
  if (typeof document === 'undefined') return null;

  const dpr = 2;
  const px = 160 * dpr;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = px / 2;
  const cy = px / 2;
  const rOuter = 52 * dpr;
  const rInner = 28 * dpr;
  const total = hardCount + softCount;

  ctx.clearRect(0, 0, px, px);

  if (total === 0) {
    ctx.fillStyle = '#e8eaf0';
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.font = `${14 * dpr}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', cx, cy);
    return canvas.toDataURL('image/png');
  }

  let angle = -Math.PI / 2;
  const hardSweep = (hardCount / total) * Math.PI * 2;
  const softSweep = (softCount / total) * Math.PI * 2;

  const drawSeg = (sweep: number, fill: string, count: number) => {
    if (sweep <= 0) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, angle, angle + sweep);
    ctx.arc(cx, cy, rInner, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fill();

    const mid = angle + sweep / 2;
    const rMid = (rOuter + rInner) / 2;
    const tx = cx + rMid * Math.cos(mid);
    const ty = cy + rMid * Math.sin(mid);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${13 * dpr}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(count), tx, ty);

    angle += sweep;
  };

  drawSeg(hardSweep, HARD_DONUT, hardCount);
  drawSeg(softSweep, SOFT_DONUT, softCount);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5 * dpr;
  angle = -Math.PI / 2;
  if (hardSweep > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, angle, angle + hardSweep);
    ctx.stroke();
    angle += hardSweep;
  }
  if (softSweep > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, angle, angle + softSweep);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

function writeSkillVisualRow(
  doc: jsPDF,
  y: number,
  item: AuditItem,
  skillLabels: string[],
  introLine: string,
  summaryLines: string[]
): number {
  let yy = ensureSpace(doc, y, 40);

  doc.setDrawColor(C_LINE[0], C_LINE[1], C_LINE[2]);
  doc.line(MARGIN, yy - 2, PAGE_W - MARGIN, yy - 2);

  drawHelpIcon(doc, COL_HELP, yy + 3);

  doc.setTextColor(C_BLUE_TITLE[0], C_BLUE_TITLE[1], C_BLUE_TITLE[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(item.title, COL_TITLE, yy + 4);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  drawStatusLarge(doc, COL_STATUS, yy, item.status === 'pass');

  doc.setFontSize(9);
  doc.setTextColor(C_GREY_BODY[0], C_GREY_BODY[1], C_GREY_BODY[2]);
  const introLines = doc.splitTextToSize(introLine, CONTENT_W);
  let ty = yy + 3;
  for (const ln of introLines) {
    ty = ensureSpace(doc, ty, LINE);
    doc.text(ln, CONTENT_X, ty);
    ty += LINE - 0.5;
  }
  doc.setTextColor(0, 0, 0);

  const boxStartY = ty + 4;
  ty = drawSkillBoxes(doc, boxStartY, skillLabels);

  doc.setFontSize(9);
  doc.setTextColor(C_GREY_BODY[0], C_GREY_BODY[1], C_GREY_BODY[2]);
  for (const s of summaryLines) {
    if (!s.trim()) continue;
    const wrapped = doc.splitTextToSize(s, CONTENT_W);
    for (const ln of wrapped) {
      ty = ensureSpace(doc, ty, LINE);
      doc.text(ln, CONTENT_X, ty);
      ty += LINE;
    }
  }
  doc.setTextColor(0, 0, 0);

  return ty + 8;
}

function writeRatioVisualRow(
  doc: jsPDF,
  y: number,
  item: AuditItem,
  ps: AuditReportPayload['pdfSemantic']
): number {
  let yy = ensureSpace(doc, y, 75);

  doc.setDrawColor(C_LINE[0], C_LINE[1], C_LINE[2]);
  doc.line(MARGIN, yy - 2, PAGE_W - MARGIN, yy - 2);

  drawHelpIcon(doc, COL_HELP, yy + 3);

  doc.setTextColor(C_BLUE_TITLE[0], C_BLUE_TITLE[1], C_BLUE_TITLE[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(item.title, COL_TITLE, yy + 4);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  drawStatusLarge(doc, COL_STATUS, yy, item.status === 'pass');

  const ratioStr = String(ps.ratio);
  const head = `The skills efficiency ratio of your resume is `;
  const tail = item.lines[1]?.trim() ?? '';

  doc.setFontSize(9.5);
  doc.setTextColor(C_GREY_BODY[0], C_GREY_BODY[1], C_GREY_BODY[2]);
  let tx = CONTENT_X;
  let ty = yy + 3;
  ty = ensureSpace(doc, ty, LINE);
  doc.text(head, tx, ty);
  tx += doc.getTextWidth(head);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C_BLUE_TITLE[0], C_BLUE_TITLE[1], C_BLUE_TITLE[2]);
  doc.text(ratioStr, tx, ty);
  tx += doc.getTextWidth(ratioStr);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C_GREY_BODY[0], C_GREY_BODY[1], C_GREY_BODY[2]);
  doc.text('.', tx, ty);
  tx += doc.getTextWidth('.');
  if (tail) doc.text(` ${tail}`, tx, ty);
  doc.setTextColor(0, 0, 0);

  ty += LINE + 6;

  const dataUrl = createDonutChartDataUrl(ps.hardCount, ps.softCount);
  const chartW = 48;
  const chartH = 48;
  ty = ensureSpace(doc, ty, chartH + 16);
  if (dataUrl) {
    doc.addImage(dataUrl, 'PNG', CONTENT_X, ty, chartW, chartH);
  }

  const legY = ty + chartH + 5;
  let lx = CONTENT_X;
  doc.setFontSize(8.5);
  doc.setTextColor(C_GREY_BODY[0], C_GREY_BODY[1], C_GREY_BODY[2]);
  doc.setFillColor(94, 106, 210);
  doc.rect(lx, legY, 4, 3, 'F');
  doc.text('Hard Skills', lx + 6, legY + 2.5);
  lx += 34;
  doc.setFillColor(130, 177, 245);
  doc.rect(lx, legY, 4, 3, 'F');
  doc.text('Soft Skills', lx + 6, legY + 2.5);
  doc.setTextColor(0, 0, 0);

  return legY + 12;
}

function writeItemPlain(doc: jsPDF, item: AuditItem, y: number): number {
  let yy = ensureSpace(doc, y, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(item.title, MARGIN, yy);
  yy += LINE + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const line of item.lines) {
    if (!line.trim()) continue;
    yy = writeParagraphWide(doc, line, yy);
    yy += 1;
  }
  yy += 3;
  return yy;
}

function writeParagraphWide(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, MAX_W);
  let yy = y;
  for (const line of lines) {
    yy = ensureSpace(doc, yy, LINE + 2);
    doc.text(line, MARGIN, yy);
    yy += LINE;
  }
  return yy;
}

function writeSectionBlock(
  doc: jsPDF,
  sectionTitle: string,
  items: AuditItem[],
  y: number
): number {
  let yy = ensureSpace(doc, y, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(sectionTitle, MARGIN, yy);
  yy += LINE + 6;

  for (const item of items) {
    yy = writeItemPlain(doc, item, yy);
  }
  return yy + 6;
}

function writeSemanticAnalysisPdf(doc: jsPDF, report: AuditReportPayload, y: number): number {
  const items = report.sections.semanticAnalysis;
  const ps = report.pdfSemantic;

  let yy = ensureSpace(doc, y, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Semantic Analysis', MARGIN, yy);
  yy += LINE + 8;

  yy = writeItemPlain(doc, items[0], yy);

  const soft = items[1];
  yy = writeSkillVisualRow(
    doc,
    yy,
    soft,
    ps.softLabels,
    soft.lines[0] ?? '',
    [soft.lines[2] ?? '', soft.lines[3] ?? ''].filter(Boolean)
  );

  const hard = items[2];
  yy = writeSkillVisualRow(
    doc,
    yy,
    hard,
    ps.hardLabels,
    hard.lines[0] ?? '',
    [hard.lines[2] ?? '', hard.lines[3] ?? ''].filter(Boolean)
  );

  yy = writeRatioVisualRow(doc, yy, items[3], ps);

  return yy + 6;
}

export function buildAuditPdfBlob(report: AuditReportPayload): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generated = new Date().toLocaleString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(212, 175, 55);
  doc.text('Atomic Support — Resume Audit Report', MARGIN, 22);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let y = 32;
  y = writeParagraphWide(doc, `Report ID: ${report.reportId}`, y);
  y = writeParagraphWide(doc, `File: ${report.fileName}`, y);
  y = writeParagraphWide(doc, `ATS Engine Version: ${ATS_ENGINE_LABEL}`, y);
  y = writeParagraphWide(doc, `Overall score: ${report.score} / 100`, y);
  y += 4;

  if (report.extractError) {
    doc.setTextColor(180, 0, 0);
    y = writeParagraphWide(doc, `Note: ${report.extractError}`, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  y = writeSectionBlock(doc, 'Document Synopsis', report.sections.documentSynopsis, y);
  y = writeSectionBlock(doc, 'Data Identification', report.sections.dataIdentification, y);
  y = writeSectionBlock(doc, 'Lexical Analysis', report.sections.lexicalAnalysis, y);
  y = writeSemanticAnalysisPdf(doc, report, y);

  y = ensureSpace(doc, y, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const disclaimer =
    'This report uses heuristics on extracted text. Results may vary for scanned PDFs or complex layouts.';
  for (const line of doc.splitTextToSize(disclaimer, MAX_W)) {
    y = ensureSpace(doc, y, LINE + 2);
    doc.text(line, MARGIN, y);
    y += LINE;
  }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(65, 65, 72);
  y = ensureSpace(doc, y, LINE + 2);
  doc.text(
    'Confidential Report — Generated by Atomic Support ATS-X Engine',
    MARGIN,
    y
  );
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  applyWatermarkToAllPages(doc, generated);

  return doc.output('blob');
}

export function downloadAuditPdf(report: AuditReportPayload, fileNameBase: string): void {
  const blob = buildAuditPdfBlob(report);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const base =
    fileNameBase.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') ?? 'resume';
  a.download = `${base}-audit-report.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
