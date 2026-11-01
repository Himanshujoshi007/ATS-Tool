'use client';
import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Upload, FileText, Check, CheckCircle2, ChevronDown, Download, RotateCcw, ShieldCheck, Sparkles, Layers3, ScanLine, X } from 'lucide-react';
import { buildAuditReport, type AuditReportPayload } from '@/lib/auditAnalysis';
import { extractResumeFile } from '@/lib/extractResume';
import { downloadAuditPdf } from '@/lib/generateAuditPdf';
import { recognizeFormat, type FormatRecognition } from '@/lib/recognizeFormat';
import { lexicalMetrics } from '@/lib/technicalAnalysis';
import { ScanExperience, AnimatedScore } from './components/ScanExperience';
import { AuditCalculations } from './components/AuditCalculations';

function ResumeSculpture() {
  function tilt(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--rx', `${-(e.clientY - r.top - r.height / 2) / 32}deg`);
    e.currentTarget.style.setProperty('--ry', `${(e.clientX - r.left - r.width / 2) / 26}deg`);
  }
  return <div className="sculpture" onPointerMove={tilt} onPointerLeave={e => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); }} aria-hidden="true">
    <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="sculpture-shadow"/>
    <div className="document-stack"><div className="paper paper-back"/><div className="paper paper-middle"/><div className="paper paper-front"><div className="paper-top"><span className="paper-avatar"/><span className="paper-stamp"><Check size={14}/></span></div><div className="paper-name"/><div className="paper-role"/><div className="paper-rule"/>{[0,1,2].map(n => <div className="paper-section" key={n}><b/>{[0,1,2].map(i => <span key={i}/>)}</div>)}<div className="paper-chips"><i/><i/><i/></div></div><div className="floating-check"><ShieldCheck size={22}/><div>Built to stand out<span>Ready for your next move</span></div></div></div>
    <div className="small-orb"/><div className="glass-label"><ScanLine size={16}/> A clearer picture of your potential</div>
  </div>;
}
export default function ResumeChecker() {
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [status, setStatus] = useState<'idle'|'scanning'|'results'>('idle');
  const [report, setReport] = useState<AuditReportPayload|null>(null);
  const [format, setFormat] = useState<FormatRecognition|null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState('Reading your document');
  const [progress, setProgress] = useState(0);
  const [scanTokens, setScanTokens] = useState(0);
  const [scanPages, setScanPages] = useState(0);
  const [scanName, setScanName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [storageEnabled, setStorageEnabled] = useState(false);
  const [saveConsent, setSaveConsent] = useState(false);
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'failed'>('idle');
  const pendingSave = useRef<{file:File; text:string; id:string}|null>(null);
  useEffect(() => { if(status !== 'idle') window.scrollTo(0,0); }, [status]);
  useEffect(() => { void fetch('/api/storage-status').then(r=>r.json()).then(data=>setStorageEnabled(data.enabled === true)).catch(()=>setStorageEnabled(false)); }, []);
  async function saveResume() {
    const submission = pendingSave.current;
    if(!submission) return;
    setSaveState('saving');
    for(let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = new FormData(); data.append('resume',submission.file); data.append('text',submission.text); data.append('submissionId',submission.id); data.append('consent','resume-review-v1');
        const response = await fetch('/api/capture',{method:'POST',body:data,signal:AbortSignal.timeout(20000)});
        const result = await response.json();
        if(response.ok && result.saved) { setSaveState('saved'); pendingSave.current = null; return; }
        if(response.status < 500) break;
      } catch { /* Keep the same submission ID: retries cannot create duplicate records. */ }
      if(attempt < 2) await new Promise(resolve=>setTimeout(resolve,1000 * (attempt + 1)));
    }
    setSaveState('failed');
  }
  async function scan(file: File) {
    if (busy.current) return;
    setError('');
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) { setError('Please choose a PDF, DOCX or TXT file. Convert older DOC files to DOCX first.'); return; }
    if (file.size > 3 * 1024 * 1024 || file.size === 0) { setError('Choose a non-empty file smaller than 3 MB.'); return; }
    if (saveState === 'saving') return;
    setSaveState('idle'); pendingSave.current = null;
    busy.current = true; setStatus('scanning'); setStep('Validating document container'); setProgress(8); setScanTokens(0); setScanPages(0); setScanName(file.name); setReport(null); setFormat(null);
    // Brief transitions make completed checks readable; progress is stage-based, not a time estimate.
    const transition = () => new Promise<void>(resolve => setTimeout(resolve,280));
    try {
      await transition();
      setStep('Extracting document text layer');
      const extracted = await extractResumeFile(file, update => { setProgress(Math.round(8+47*update.completed/update.total)); setScanPages(file.name.toLowerCase().endsWith('.pdf') ? update.completed : 0); setStep(update.label); });
      if (extracted.extractError || extracted.plainText.split(/\s+/).filter(Boolean).length < 50) throw new Error(extracted.extractError || 'Not enough readable text. Upload a text-based resume with at least 50 words. Scanned PDFs need OCR first.');
      setProgress(55); setStep('Normalizing Unicode & indexing lexical tokens');
      await transition();
      const lexical = lexicalMetrics(extracted.plainText); setScanTokens(lexical.tokens);
      setProgress(70); setStep('Mapping sections, action verbs & quantified evidence');
      await transition();
      const finalReport = buildAuditReport(file, extracted, lexical);
      setProgress(88); setStep('Reconciling category weights & score contributions');
      await transition();
      if(finalReport.categories.reduce((sum,category)=>sum+category.earned,0)!==finalReport.score) throw new Error('Score verification failed. Please try again.');
      setReport(finalReport);
      setFormat(recognizeFormat(file.name, extracted.plainText, extracted.extractError));
      setProgress(100); setStep('Audit verified · preparing your results');
      await transition();
      setStatus('results');
      if(saveConsent && storageEnabled) { pendingSave.current = {file,text:extracted.plainText,id:crypto.randomUUID()}; void saveResume(); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to read this file. Try another PDF or DOCX.'); setStatus('idle'); }
    finally { busy.current = false; if (input.current) input.current.value = ''; }
  }
  function drop(e: DragEvent<HTMLButtonElement>) { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) void scan(e.dataTransfer.files[0]); }
  async function exportReport() { if (!report || exporting) return; setExporting(true); try { downloadAuditPdf(report, report.fileName); } catch { setError('The report could not be exported. Please try again.'); } finally { setExporting(false); } }
  const reset = () => { if(saveState === 'saving') return; setStatus('idle'); setError(''); setReport(null); setFormat(null); setSaveState('idle'); pendingSave.current = null; };
  return <div className="app-shell">
    <nav className="topbar"><Link href="/" className="brand" aria-label="ResumePro home"><span className="brand-icon"><Layers3 size={22}/></span>Resume<span className="brand-light">Pro</span><span className="beta">STUDIO</span></Link><div className="nav-right"><span className="local-pill"><i/> Resume intelligence</span><a className="expert-link" href="https://wa.me/917016193407" target="_blank" rel="noopener noreferrer">Talk to an expert <ArrowUpRight size={16}/></a></div></nav>
    <main>
      {status === 'idle' && <>
        <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/> YOUR NEXT CHAPTER STARTS HERE</div><h1>Good experience.<br/>Great resume.<br/><span>Better possibilities.</span></h1><p className="hero-description">Turn your experience into a stronger first impression. Get a thoughtful resume audit, clear priorities, and a little more confidence for your next move.</p><div className="hero-actions"><button className="primary-button" onClick={() => input.current?.click()}>Check my resume <ArrowUpRight size={19}/></button><a className="quiet-link" href="#how-it-works">How it works <ArrowRight size={16}/></a></div><div className="hero-facts"><span><ShieldCheck size={15}/> Analyzed on your device</span><span><CheckCircle2 size={15}/> No account needed</span></div></div><ResumeSculpture/></section>
        <section className="workspace" aria-label="Resume upload"><div className="workspace-heading"><div><span className="kicker">A FRESH PERSPECTIVE</span><h2>Your next opportunity, one upload closer.</h2></div><span className="step-chip">01 / UPLOAD</span></div><button className={`upload-zone ${dragging ? 'dragging' : ''}`} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><span className="upload-icon"><Upload size={25}/></span><span className="upload-copy"><strong>Drop your resume here</strong><span>or choose a file from your device</span></span><span className="upload-types">PDF, DOCX, TXT <span>UP TO 3 MB</span></span><span className="upload-arrow"><ArrowUpRight size={22}/></span></button><p className="privacy-line"><ShieldCheck size={13}/> {saveConsent && storageEnabled ? 'With your permission, your resume and extracted contact details are saved privately for up to 90 days for expert review.' : 'Your resume is analyzed on your device. Nothing is saved unless you choose private expert review.'}</p></section>
        {storageEnabled && <label className="consent-control"><input type="checkbox" checked={saveConsent} onChange={e=>setSaveConsent(e.target.checked)}/><span>Save a private copy for expert review. I agree to storage of my resume, name, email, phone, LinkedIn and education for up to 90 days. <Link href="/privacy">Privacy details</Link></span></label>}<section id="how-it-works" className="how-grid">{[{n:'01',icon:<FileText size={20}/>,title:'Bring your experience',text:'Upload your current resume. A text-based PDF or Word document works best.'},{n:'02',icon:<ScanLine size={20}/>,title:'Get a clearer view',text:'Explore six scoring areas, from structure and clarity to evidence of your impact.'},{n:'03',icon:<Sparkles size={20}/>,title:'Make your next move',text:'Focus on the most valuable improvements and take your detailed report with you.'}].map(c => <article key={c.n}><div className="how-top">{c.icon}<span>{c.n}</span></div><h3>{c.title}</h3><p>{c.text}</p></article>)}</section>
      </>}
      {status === 'scanning' && <ScanExperience progress={progress} label={step} fileName={scanName} tokens={scanTokens} pages={scanPages}/>}
      {status === 'results' && report && <section className="results"><div className="result-header"><div><span className="eyebrow"><span/> YOUR RESUME, IN FOCUS</span><h1>A clearer path forward.</h1><p className="filename"><FileText size={15}/>{report.fileName}</p></div><div className="result-actions"><button className="secondary-button" onClick={reset} disabled={saveState === 'saving'}><RotateCcw size={16}/> New resume</button><button className="primary-button" onClick={() => void exportReport()} disabled={exporting}><Download size={17}/>{exporting ? 'Exporting…' : 'Save report'}</button></div></div>
        {saveState !== 'idle' && <div className="save-notice" role="status"><ShieldCheck size={18}/><span>{saveState === 'saving' ? 'Saving your private review copy… Please keep this page open.' : saveState === 'saved' ? 'Your private review copy has been saved.' : 'Private saving was not confirmed. Your audit is ready; retry before leaving this page.'}</span>{saveState === 'failed' && <button className="secondary-button" onClick={()=>void saveResume()}>Retry save</button>}</div>}<div className="overview-grid"><article className="score-card glass-panel"><span className="kicker">RESUME QUALITY</span><AnimatedScore score={report.score}/><h2>{report.score >= 85 ? 'A strong foundation.' : report.score >= 65 ? 'Good potential. Room to grow.' : 'Let’s build a stronger story.'}</h2><p>Based on the content we could read.<br/>Job-specific fit is not assessed.</p><div className="score-meta"><span>{report.wordCount} words</span><span>{report.achievementCount} impact signals</span></div></article>
        <article className="breakdown-card glass-panel"><div className="card-title"><div><span className="kicker">THE BIG PICTURE</span><h2>What’s behind your score</h2></div><Layers3 size={22}/></div><div className="category-list">{report.categories.map(c => <div className="category" key={c.name}><div><strong>{c.name}</strong><span>{c.earned}<small> / {c.possible}</small></span></div><div className="meter"><i style={{width:`${100*c.earned/c.possible}%`}}/></div><p>{c.explanation}</p></div>)}</div></article></div>
        {format && <div className={`template-banner ${format.likelyMatch ? 'matched' : ''}`}><span className="template-icon">{format.likelyMatch ? <ShieldCheck size={23}/> : <FileText size={23}/>}</span><div><strong>{format.likelyMatch ? 'Template quality recognized' : 'Template format not recognized'}</strong><p>{format.likelyMatch ? 'Your document follows a consistent professional format.' : 'This does not affect your resume quality audit.'}</p></div>{format.score !== null && <div className="template-score"><strong>{format.score}%</strong><span>TEMPLATE QUALITY</span></div>}</div>}
        <AuditCalculations report={report}/><div className="section-heading"><div><span className="kicker">SMALL CHANGES. MEANINGFUL PROGRESS.</span><h2>Your next best improvements</h2></div><span className="muted">Prioritized by potential score improvement</span></div><div className="feedback-grid">{report.feedback.map((f,i) => <article className="feedback-card glass-panel" key={f.title}><span className="priority">{f.type === 'success' ? <Check size={18}/> : `0${i+1}`}</span><h3>{f.title}</h3><p>{f.desc}</p></article>)}</div>
        <section className="details-panel glass-panel"><div className="card-title"><div><span className="kicker">NO GUESSWORK</span><h2>Your detailed audit</h2></div><span className="muted">Evidence + practical advice</span></div>{[{name:'Document & readability',items:report.sections.documentSynopsis},{name:'Contact & structure',items:report.sections.dataIdentification},{name:'Writing & clarity',items:report.sections.lexicalAnalysis},{name:'Skills & impact',items:report.sections.semanticAnalysis}].map(group => <details key={group.name}><summary>{group.name}<span>{group.items.reduce((n,i)=>n+(i.earned??0),0)} / {group.items.reduce((n,i)=>n+(i.possible??0),0)} pts <ChevronDown size={16}/></span></summary><div className="detail-items">{group.items.map(item => <div className="detail-item" key={item.title}><span className={item.status === 'pass' ? 'check-pass' : 'check-review'}>{item.status === 'pass' ? <Check size={15}/> : '↗'}</span><div><h4>{item.title}<small>{item.earned} / {item.possible}</small></h4>{item.lines.map((line,i) => <p key={i}>{line}</p>)}</div></div>)}</div></details>)}</section>
      </section>}
      {error && <div className="error-message" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={18}/></button></div>}
      <input type="file" ref={input} accept=".pdf,.docx,.txt" className="file-input" aria-label="Choose resume file" onChange={e => { if(e.target.files?.[0]) void scan(e.target.files[0]); }}/>
    </main><footer><Link href="/" className="footer-brand">ResumePro<span> A little clarity. A better next step.</span></Link><span>Thoughtfully reviewed. Confidently improved.</span></footer>
  </div>;
}
