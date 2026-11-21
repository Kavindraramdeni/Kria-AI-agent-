const fs = require('fs');
const path = require('path');

// Only run this patch in developer environments where the directory path contains '!'
if (!process.cwd().includes('!')) {
  console.log('Standard environment detected (no exclamation mark in path). Skipping webpack path patch.');
  process.exit(0);
}

// 1. Patch schema-utils3 exclamation mark validator for local paths with '!'
const schemaUtilsFile = path.resolve('node_modules/next/dist/compiled/schema-utils3/index.js');
if (fs.existsSync(schemaUtilsFile)) {
  let content = fs.readFileSync(schemaUtilsFile, 'utf8');
  if (content.includes('const s=t.includes("!");')) {
    content = content.replace('const s=t.includes("!");', 'const s=false && t.includes("!");');
    fs.writeFileSync(schemaUtilsFile, content, 'utf8');
    console.log('Successfully patched schema-utils3 exclamation mark validation.');
  }
}
