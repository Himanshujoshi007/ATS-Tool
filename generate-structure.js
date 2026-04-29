import fs from 'fs';
import path from 'path';

const IGNORE_DIRS = ['node_modules', '.git', '.next', 'build', 'dist'];
let output = 'ATS tool/\n';

function generateTree(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach((file, index) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const isLast = index === files.length - 1;
        const marker = isLast ? '└── ' : '├── ';

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                output += `${prefix}${marker}${file}/\n`;
                generateTree(filePath, prefix + (isLast ? '    ' : '│   '));
            }
        } else {
            output += `${prefix}${marker}${file}\n`;
        }
    });
}

generateTree('./');
fs.writeFileSync('project-structure.txt', output);
console.log('Done! Project structure saved to project-structure.txt!');