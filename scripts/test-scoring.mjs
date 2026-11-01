import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const extraction = `data:text/javascript;base64,${Buffer.from(compile('../lib/extractResume.ts')).toString('base64')}`;
const technical = `data:text/javascript;base64,${Buffer.from(compile('../lib/technicalAnalysis.ts')).toString('base64')}`;
const compiled = compile('../lib/auditAnalysis.ts').replace("'./extractResume'", JSON.stringify(extraction)).replace("'./technicalAnalysis'",JSON.stringify(technical));
const { buildAuditReport } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const resume = `Alex Example
alex@example.com | +1 (415) 555-0198
Summary
Embedded software developer focused on reliable systems and collaborative delivery of production applications.
Technical Skills
C++ C# Python RTOS AUTOSAR
Professional Experience
Embedded Software Developer, Example Systems | Jul 2022 - Present
Project: Firmware modernization
Technology Stack: C++, Python, RTOS, AUTOSAR
Developed firmware in C++ and reduced latency by 25% across production devices.
Built Python test automation and saved 12 hours per release.
Improved deployment reliability by 30% through automated validation.
Led collaboration across engineering teams to coordinate delivery.
Implemented C# diagnostics for device analysis and supported release verification.
Education
Bachelor of Engineering | 2018 - 2022
${'Implemented automated validation and maintained firmware documentation to support dependable delivery across engineering teams. '.repeat(10)}`;
const file = new File([resume], 'Alex Example - Embedded Developer.txt');
const analyze = (text, error = null) => buildAuditReport(file, { plainText:text, pageCount:null, extractError:error });
const strong = analyze(resume);
const {lexicalMetrics,percentage} = await import(technical);
assert.deepEqual(lexicalMetrics(''),{tokens:0,uniqueTokens:0,diversity:0});
assert.equal(lexicalMetrics('Python Python C++').uniqueTokens,2);
assert.equal(percentage(1,4),25);
assert.equal(percentage(0,0),0);
assert.equal(strong.technical.quantifiedDensity,percentage(3,strong.technical.passages));
assert.equal(strong.technical.evidenceCoverage,percentage(strong.technical.appliedSkills,strong.technical.detectedSkills));
assert.ok(strong.technical.diversity>0 && strong.technical.diversity<=100);
assert.equal(strong.achievementCount, 3);
assert.ok(strong.score >= 90);
assert.equal(strong.categories.reduce((n,c) => n+c.possible,0),100);
assert.equal(strong.categories.reduce((n,c) => n+c.earned,0),strong.score);
assert.equal(analyze('').score,0);
assert.equal(analyze(resume,'Parser failure').score,0);
assert.equal(analyze('Summary\n'+'A short note. '.repeat(8)).assessable,false);
const noMetrics = analyze(resume.replace(/25%|12 hours|30%/g,'many'));
assert.equal(noMetrics.achievementCount,0);
assert.ok(noMetrics.score < strong.score);
const noContact = analyze(resume.replace('alex@example.com | +1 (415) 555-0198',''));
assert.equal(noContact.categories.find(c=>c.name==='Contact details').earned,0);
assert.ok(strong.pdfSemantic.hardLabels.includes('c++'));
assert.ok(strong.pdfSemantic.hardLabels.includes('c#'));
const yearsOnly = analyze('Professional Experience\nDeveloped firmware 2022 - 2024.\n'+ 'Supported teams and maintained delivery documentation. '.repeat(20));
assert.equal(yearsOnly.achievementCount,0);
assert.ok(!analyze('Professional Experience\nImproved go-to-market digital strategy.\n'+'Supported teams with ongoing planning. '.repeat(20)).pdfSemantic.hardLabels.includes('go'));
mkdirSync(new URL('../test-fixtures/',import.meta.url),{recursive:true});
writeFileSync(new URL('../test-fixtures/Alex Example - Embedded Developer.txt',import.meta.url),resume);
console.log(`Scoring regression checks passed. Strong: ${strong.score}; without metrics: ${noMetrics.score}; unreadable: 0.`);
const pdfCompiled = compile('../lib/generateAuditPdf.ts').replace("'jspdf'", JSON.stringify(import.meta.resolve('jspdf')));
const { buildAuditPdfBlob } = await import(`data:text/javascript;base64,${Buffer.from(pdfCompiled).toString('base64')}`);
writeFileSync(new URL('../test-fixtures/audit-preview.pdf',import.meta.url),Buffer.from(await buildAuditPdfBlob(strong).arrayBuffer()));
console.log('PDF export generated successfully.');
const { jsPDF } = await import('jspdf');
const samplePdf = new jsPDF();
samplePdf.setFontSize(10);
samplePdf.text(samplePdf.splitTextToSize(resume,170),20,20);
writeFileSync(new URL('../test-fixtures/Alex Example - Embedded Developer.pdf',import.meta.url),Buffer.from(samplePdf.output('arraybuffer')));
