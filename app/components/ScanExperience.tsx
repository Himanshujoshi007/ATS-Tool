'use client';
import { useEffect, useState } from 'react';
import { Check, FileText, ScanLine, Layers3 } from 'lucide-react';
const stages = [
 {at:8,name:'Container validation',detail:'File type · payload boundaries'},
 {at:55,name:'Text-layer extraction',detail:'Document decoding · page geometry'},
 {at:70,name:'Lexical tokenization',detail:'Unicode normalization · token inventory'},
 {at:88,name:'Evidence mapping',detail:'Section detection · skills in context'},
 {at:100,name:'Weighted score aggregation',detail:'Category weights · score reconciliation'},
];
export function ScanExperience({progress,label,fileName,tokens,pages}:{progress:number;label:string;fileName:string;tokens:number;pages:number}) {
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const start=performance.now();const timer=setInterval(()=>setElapsed((performance.now()-start)/1000),100);return()=>clearInterval(timer);},[]);
 return <section className="scan-experience glass-panel" aria-label="Resume analysis progress"><div className="scan-visual" aria-hidden="true"><div className="scan-halo halo-a"/><div className="scan-halo halo-b"/><div className="scan-cube"><div className="cube-face face-front"><ScanLine size={38}/></div><div className="cube-face face-back"><Layers3 size={38}/></div><div className="cube-face face-left"/><div className="cube-face face-right"/><div className="cube-face face-top"/><div className="cube-face face-bottom"/></div><div className="scan-beam"/><span className="scan-float float-a">Σ wᵢ · qᵢ</span><span className="scan-float float-b">tokens → evidence</span></div><div className="scan-content"><span className="eyebrow"><span/> RESUMEPRO ANALYSIS PIPELINE</span><h1>Your experience.<br/><em>Decoded with care.</em></h1><p className="scan-filename"><FileText size={14}/>{fileName}</p><div className="progress-title" aria-live="polite"><strong>{label}</strong><span>{progress}<small>%</small></span></div><div className="scan-progress" role="progressbar" aria-label="Completed analysis stages" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{width:`${progress}%`}}/></div><div className="scan-stats"><span><b>{elapsed.toFixed(1)}s</b>elapsed</span><span><b>{pages || '—'}</b>pages read</span><span><b>{tokens ? tokens.toLocaleString() : '—'}</b>lexical tokens</span></div><ol className="pipeline-stages">{stages.map((stage,index)=>{const done=progress>=stage.at;const active=!done && (index===0 || progress>=stages[index-1].at);return <li className={done?'complete':active?'active':''} key={stage.name}><span className="stage-marker">{done?<Check size={13}/>:String(index+1).padStart(2,'0')}</span><div><strong>{stage.name}</strong><small>{stage.detail}</small></div><span className="stage-state">{done?'COMPLETE':active?'RUNNING':'QUEUED'}</span></li>;})}</ol><p className="scan-footnote">Progress reflects completed stages. Processing time varies with your document.</p></div></section>;
}
export function AnimatedScore({score}:{score:number}) {
 const [shown,setShown]=useState(0);
 useEffect(()=>{const start=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let frame=0;function tick(now:number){const t=reduced?1:Math.min(1,(now-start)/1000);setShown(Math.round(score*(1-Math.pow(1-t,3))));if(t<1)frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[score]);
 return <div className="score-ring" role="img" aria-label={`${score} out of 100 resume quality score`} style={{background:`conic-gradient(var(--yellow) ${shown*3.6}deg, #ffffff12 0deg)`}}><div><strong aria-hidden="true">{shown}</strong><span>OUT OF 100</span></div></div>;
}
