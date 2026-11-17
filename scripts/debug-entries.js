const fs = require('fs');
const file = 'node_modules/next/dist/build/entries.js';
let c = fs.readFileSync(file, 'utf8');
if (!c.includes('console.log("OPTS_LOG:"')) {
  c = c.replace('function getAppEntry(opts) {', 'function getAppEntry(opts) {\n    console.log("OPTS_LOG:", JSON.stringify(opts));');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Added log to getAppEntry');
}
