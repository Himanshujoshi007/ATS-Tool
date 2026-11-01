import { jsPDF } from 'jspdf';
import type { AuditReportPayload } from './auditAnalysis';

export function buildAuditPdfBlob(report: AuditReportPayload): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 25;
  const margin = 20;
  const width = 170;
  const safe = (s: string) => s.replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\n]/g, ' ');
  function room(height: number) { if (y + height > 274) { doc.addPage(); y = 25; } }
  function paragraph(text: string, size = 10, bold = false, color = '#535a50') {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(safe(text), width) as string[];
    const leading = size * .48;
    for (const line of lines) { room(leading); doc.text(line, margin, y); y += leading; }
    y += 3;
  }
  paragraph('ResumePro / RESUME AUDIT', 21, true, '#252b23');
  paragraph(`Resume quality: ${report.score} / 100`, 16, true, '#8a7019');
  paragraph(`File: ${report.fileName}`, 9);
  paragraph(`Report: ${report.reportId} | ${new Date().toLocaleDateString('en-GB')} | Audit model 2.0`, 9);
  paragraph('A content-based quality review. Job-specific fit and employer ATS outcomes are not assessed.', 9);
  y += 5;
  paragraph('Score breakdown', 14, true, '#252b23');
  for (const category of report.categories) {
    room(18); paragraph(`${category.name}: ${category.earned} / ${category.possible}`, 11, true);
    paragraph(category.explanation, 9);
  }
  y += 4;
  paragraph('Highest-priority improvements', 14, true, '#252b23');
  for (const feedback of report.feedback) { room(20); paragraph(feedback.title, 11, true); paragraph(feedback.desc); }
  for (const section of [
    { title:'Document & readability', items:report.sections.documentSynopsis },
    { title:'Contact & structure', items:report.sections.dataIdentification },
    { title:'Writing & clarity', items:report.sections.lexicalAnalysis },
    { title:'Skills & impact', items:report.sections.semanticAnalysis },
  ]) {
    y += 5; room(35); paragraph(section.title, 14, true, '#252b23');
    for (const item of section.items) { room(24); paragraph(`${item.title} - ${item.earned} / ${item.possible} points`, 11, true); for (const line of item.lines) paragraph(line); y += 2; }
  }
  for (let n = 1; n <= doc.getNumberOfPages(); n++) {
    doc.setPage(n); doc.setDrawColor('#dedfd7'); doc.line(20, 282, 190, 282);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#8b9183');
    doc.text('ResumePro | Private resume review', 20, 288); doc.text(`${n} / ${doc.getNumberOfPages()}`, 190, 288, { align:'right' });
  }
  return doc.output('blob');
}
export function downloadAuditPdf(report: AuditReportPayload, fileNameBase: string): void {
  const url = URL.createObjectURL(buildAuditPdfBlob(report));
  const link = document.createElement('a'); link.href = url;
  link.download = `${fileNameBase.replace(/\.[^.]+$/, '').replace(/[/\\]/g, '-')}-audit-report.pdf`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
