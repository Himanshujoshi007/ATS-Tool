'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Briefcase, Award, Zap, Check, ArrowRight, Download, Hexagon 
} from 'lucide-react';
import type { AuditReportPayload } from '@/lib/auditAnalysis';
import { buildAuditReport } from '@/lib/auditAnalysis';
import { extractResumeFile } from '@/lib/extractResume';
import { downloadAuditPdf } from '@/lib/generateAuditPdf';

export default function ResumeChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'results'>('idle');
  const [scanStep, setScanStep] = useState('');
  const [report, setReport] = useState<AuditReportPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetResumeCount = useMemo(
    () => 700 + Math.floor(Math.random() * 51),
    []
  );
  const [resumeCount, setResumeCount] = useState(0);

  useEffect(() => {
    const durationMs = 2800;
    const easeOutExpo = (t: number) =>
      t >= 1 ? 1 : 1 - 2 ** (-10 * t);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutExpo(t);
      setResumeCount(Math.round(eased * targetResumeCount));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setResumeCount(targetResumeCount);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetResumeCount]);

  // --- 3D TILT EFFECT LOGIC ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const techGiants = ["Google", "Apple", "Microsoft", "Amazon", "Meta", "Tesla", "Netflix", "IBM", "Stripe", "OpenAI", "Nvidia", "Adobe", "Shopify", "SpaceX", "Oracle", "Cisco", "Intel", "Qualcomm"];

  const simulateScan = async (selectedFile: File) => {
    setStatus('scanning');
    setFile(selectedFile);
    
    const steps = [
      'Initializing Neural Parser...',
      'Executing LSA Analysis...',
      'Tokenizing Section Nodes...',
      'Finalizing AI Diagnostic...',
    ];

    // --- NEW: BACKEND CAPTURE LOGIC ---
    // This part sends the file to your Node.js Brain while the animation plays
    const captureData = async () => {
      try {
        const formData = new FormData();
        formData.append('resume', selectedFile);
        formData.append('name', selectedFile.name.split('-')[0] || "Candidate"); // Guessing name from filename
        formData.append('score', '0');

        const response = await fetch('/api/capture', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        console.log("🚀 Data captured by Brain:", result);
      } catch (err) {
        console.error("❌ Brain communication failed:", err);
      }
    };

    // Start the capture in the background
    captureData();

    // The rest of your existing animation logic
    const extractionPromise = extractResumeFile(selectedFile);
    for (const step of steps) {
      setScanStep(step);
      await new Promise((r) => setTimeout(r, 1100));
    }
    const extracted = await extractionPromise;
    const finalReport = buildAuditReport(selectedFile, extracted);
    setReport(finalReport);
    setStatus('results');
  };

  const handleDownloadReport = () => {
    if (!report) return;
    downloadAuditPdf(report, report.fileName);
  };

  const MarqueeLine = ({ reverse = false, speed = 100, opacity = 0.05 }) => (
    <div className="flex overflow-hidden whitespace-nowrap select-none pointer-events-none mb-10">
      <motion.div 
        initial={{ x: reverse ? "-50%" : "0%" }}
        animate={{ x: reverse ? "0%" : "-50%" }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        className="flex gap-32 items-center pr-32"
        style={{ opacity }}
      >
        {[...techGiants, ...techGiants, ...techGiants].map((c, i) => (
          <span key={i} className="text-[8rem] font-black italic tracking-tighter">{c.toUpperCase()}</span>
        ))}
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative selection:bg-yellow-500/30">
      
      {/* --- REFINED 6-LAYER BACKGROUND --- */}
      <div className="absolute inset-0 z-0 flex flex-col justify-center">
        <MarqueeLine speed={100} opacity={0.05} />
        <MarqueeLine reverse speed={130} opacity={0.03} />
        <MarqueeLine speed={90} opacity={0.06} />
        <MarqueeLine reverse speed={150} opacity={0.04} />
        <MarqueeLine speed={120} opacity={0.05} />
        <MarqueeLine reverse speed={140} opacity={0.02} />
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="relative z-50 bg-black/95 backdrop-blur-2xl border-b border-white/5 px-8 py-5 flex justify-between items-center">
        <motion.div 
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="flex items-center gap-3 font-black text-2xl cursor-pointer group"
        >
          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-black shadow-[0_0_25px_rgba(234,179,8,0.6)] group-hover:scale-110 transition-all">R</div>
          <span className="tracking-tighter">Resume<span className="text-yellow-500">Pro</span></span>
        </motion.div>
        
        <motion.a
            href="https://wa.me/917016193407"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(234,179,8,0.5)" }}
            whileTap={{ scale: 0.95, y: 5 }}
            className="bg-yellow-500 text-black px-10 py-3.5 rounded-2xl font-black text-sm shadow-[0_10px_0_0_#854d0e] transition-all hover:-translate-y-1 inline-block"
        >
          CONNECT WITH CV EXPERT
        </motion.a>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="text-center"
            >
              {/* --- RESUME / NEURAL AUDIT STRIP --- */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center justify-center bg-white/[0.03] border border-white/10 px-8 py-3 rounded-full mb-10 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-t-blue-500/20"
              >
                <span className="text-xs font-black tracking-[0.2em] text-slate-300">
                  Total Resume Count --{' '}
                  <motion.span
                    className="text-white text-base tracking-normal tabular-nums inline-block origin-center mr-5 md:mr-7"
                    animate={{
                      scale: [1, 1.12, 1, 1.08, 1],
                      opacity: [1, 0.88, 1, 0.92, 1],
                    }}
                    transition={{
                      duration: 1.15,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: [0, 0.12, 0.22, 0.38, 1],
                    }}
                  >
                    {resumeCount.toLocaleString()}
                  </motion.span>
                  NEURAL AUDITS PROCESSED
                </span>
              </motion.div>

              <h1 className="text-7xl md:text-9xl font-black mb-10 tracking-tighter leading-none italic drop-shadow-2xl">
                Beat the <span className="text-yellow-500">ATS.</span>
              </h1>
              
              <motion.div 
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[4rem] p-32 cursor-pointer group shadow-[0_50px_100px_rgba(0,0,0,0.7)] max-w-4xl mx-auto border-dashed hover:border-yellow-500/40 transition-all duration-700 relative"
              >
                <div className="absolute inset-0 bg-yellow-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity rounded-[4rem]" />
                <Upload size={120} className="mx-auto mb-10 text-blue-500 group-hover:text-yellow-500 transition-all duration-500 group-hover:-translate-y-6 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
                <h3 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic leading-tight">Inject Professional File</h3>
                <p className="text-slate-500 font-bold tracking-[0.5em] text-xs uppercase opacity-70">Boolean Parsing • LSA Logic • USA & Canada</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => e.target.files?.[0] && void simulateScan(e.target.files[0])}
                />
              </motion.div>
            </motion.div>
          )}

          {status === 'scanning' && (
            <motion.div key="scanning" className="py-40 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                <RefreshCw size={140} className="mx-auto mb-14 text-yellow-500 drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]" />
              </motion.div>
              <h2 className="text-6xl font-black text-white tracking-[0.25em] uppercase italic drop-shadow-xl">{scanStep}</h2>
            </motion.div>
          )}

          {status === 'results' && report && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
            >
              <div className="bg-white/[0.04] backdrop-blur-3xl rounded-[3rem] p-14 flex flex-col md:flex-row justify-between items-center border border-white/10 shadow-3xl border-l-[20px] border-l-yellow-500">
                <div>
                  <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Diagnostic Locked</h2>
                  <p className="text-yellow-500 font-black tracking-[0.3em] uppercase mt-8 text-xl opacity-80">{report.fileName}</p>
                </div>
                <div className="flex gap-8 mt-10 md:mt-0">
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(234,179,8,0.5)" }}
                    whileTap={{ scale: 0.95, y: 6 }}
                    onClick={handleDownloadReport} 
                    className="bg-yellow-500 text-black px-14 py-6 rounded-3xl font-black flex items-center gap-5 shadow-[0_12px_0_0_#854d0e] transition-all"
                  >
                    <Download size={28}/> EXPORT AUDIT
                  </motion.button>
                  <button onClick={() => setStatus('idle')} className="bg-white/5 px-12 py-6 rounded-3xl font-bold hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest text-sm italic">New Diagnostic</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <motion.div 
                    style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="bg-white/[0.02] backdrop-blur-2xl p-20 rounded-[4rem] flex flex-col items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden group min-h-[450px]"
                >
                  <div className="absolute inset-0 bg-yellow-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-slate-500 font-black uppercase tracking-[0.6em] text-[0.7rem] mb-14 italic">Neural Match Index</h3>
                  <div className="text-[12rem] leading-none font-black text-yellow-500 drop-shadow-[0_0_60px_rgba(234,179,8,0.4)] tracking-tighter relative z-10">{report.score}</div>
                </motion.div>
                
                <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-2xl p-16 rounded-[4rem] border border-white/10 shadow-2xl">
                  <h3 className="text-yellow-500 font-black uppercase tracking-widest mb-14 flex items-center gap-8 text-4xl italic underline underline-offset-[12px] decoration-white/10"><Award size={48}/> Semantic Logic Log</h3>
                  <div className="space-y-10">
                    {report.feedback.map((f: any, i: number) => (
                      <motion.div 
                        whileHover={{ x: 20, backgroundColor: "rgba(255,255,255,0.05)" }}
                        key={i} className="flex gap-10 p-10 rounded-[2.5rem] border border-white/5 bg-white/0 transition-all cursor-default group"
                      >
                        {f.type === 'error' ? (
                          <XCircle size={48} className="text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
                        ) : f.type === 'warning' ? (
                          <AlertTriangle size={48} className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                        ) : (
                          <CheckCircle2 size={48} className="text-green-500 shrink-0 group-hover:scale-110 transition-transform" />
                        )}
                        <div>
                          <p className="font-black text-white text-3xl uppercase tracking-tighter mb-3 italic leading-tight">{f.title}</p>
                          <p className="text-slate-400 font-medium leading-relaxed text-xl opacity-90">{f.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
