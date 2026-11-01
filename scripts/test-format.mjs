import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/recognizeFormat.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { recognizeFormat } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const filename = 'SAI LOKESH DUDDUKURU - Embedded Software Developer.pdf';
const resume = 'Summary Experienced developer delivering reliable embedded applications and collaborating across engineering teams. Technical Skills C++ Python Professional Experience Embedded Software Developer, Dell Technologies. Project: Server Firmware Modernization. Technology Stack: C++, Python. Built firmware services and improved reliability. Education Bachelor of Technology.';
assert.equal(recognizeFormat(filename, resume, null).score, 100);
assert.equal(recognizeFormat(filename, resume.replace('Technology Stack:', 'Tools:'), null).score, 95);
assert.equal(recognizeFormat(filename, resume.replace('Technology Stack:', 'Tools:').replace('Education', 'Qualifications'), null).score, 90);
assert.equal(recognizeFormat(filename, resume.replace('Technology Stack:', 'Tools:').replace('Education', 'Qualifications').replace('Summary', 'Profile'), null).score, 85);
assert.equal(recognizeFormat('unrelated.pdf', resume, null).score, null);
assert.equal(recognizeFormat(filename, '', null).score, null);
assert.equal(recognizeFormat(filename, resume, 'Parser failed').score, null);
assert.equal(recognizeFormat(filename, resume.replace('Project:', 'Assignment:'), null).score, null);
assert.equal(recognizeFormat(filename, resume.replace('Project: Server Firmware Modernization.', 'Built the Server Firmware Modernization project.'), null).score, 100);
assert.equal(recognizeFormat(filename, resume.replace('Project: Server Firmware Modernization.', '') + ' Personal Projects Project: Side project', null).score, null);
for (const name of ['Fahad Mateen Quadri Syed - Healthcare Coordinator.docx', 'SRIYATEJASWI KATAKAMSETTY - AI-ML Engineer.pdf']) {
  assert.equal(recognizeFormat(name, resume, null).score, 100);
}
console.log('12 format recognition checks passed.');
