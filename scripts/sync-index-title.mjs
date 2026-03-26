import fs from 'node:fs';
import path from 'node:path';

const mode = (process.argv[2] || 'development').toLowerCase();
const projectRoot = process.cwd();

const environmentFile =
  mode === 'production'
    ? path.join(projectRoot, 'src/environments/environment.prod.ts')
    : path.join(projectRoot, 'src/environments/environment.ts');

const indexFile = path.join(projectRoot, 'src/index.html');

function extractAppName(tsContent) {
  const match = tsContent.match(/appName\s*:\s*['\"]([^'\"]+)['\"]/);
  return match ? match[1].trim() : null;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

if (!fs.existsSync(environmentFile)) {
  throw new Error(`Environment file not found: ${environmentFile}`);
}

if (!fs.existsSync(indexFile)) {
  throw new Error(`index.html not found: ${indexFile}`);
}

const envContent = fs.readFileSync(environmentFile, 'utf8');
const appName = extractAppName(envContent);

if (!appName) {
  throw new Error(`Could not read appName from: ${environmentFile}`);
}

const indexContent = fs.readFileSync(indexFile, 'utf8');
const updatedIndexContent = indexContent.replace(
  /<title>[\s\S]*?<\/title>/i,
  `<title>${escapeHtml(appName)}</title>`
);

if (updatedIndexContent !== indexContent) {
  fs.writeFileSync(indexFile, updatedIndexContent, 'utf8');
}

console.log(`[sync-index-title] ${mode} -> ${appName}`);
