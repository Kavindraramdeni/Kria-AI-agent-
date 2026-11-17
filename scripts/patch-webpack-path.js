const fs = require('fs');
const path = require('path');

// 1. Patch schema-utils3 exclamation mark validator
const schemaUtilsFile = path.resolve('node_modules/next/dist/compiled/schema-utils3/index.js');
if (fs.existsSync(schemaUtilsFile)) {
  let content = fs.readFileSync(schemaUtilsFile, 'utf8');
  if (content.includes('const s=t.includes("!");')) {
    content = content.replace('const s=t.includes("!");', 'const s=false && t.includes("!");');
    fs.writeFileSync(schemaUtilsFile, content, 'utf8');
    console.log('Successfully patched schema-utils3 exclamation mark validation.');
  }
}

// 2. Patch entries.js getAppEntry so Webpack inline loader queries escape ! to %21
const entriesFile = path.resolve('node_modules/next/dist/build/entries.js');
if (fs.existsSync(entriesFile)) {
  let content = fs.readFileSync(entriesFile, 'utf8');
  const target = 'import: `next-app-loader?${(0, _querystring.stringify)(opts)}!`,';
  const replacement = 'import: `next-app-loader?${(0, _querystring.stringify)(opts).replace(/!/g, "%21")}!`,';
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(entriesFile, content, 'utf8');
    console.log('Successfully patched entries.js loader query exclamation mark escaping.');
  }
}
