import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const publicEntries = ['index.html', 'assets', 'data', 'matematica', 'fisica', 'quimica', 'videoaulas'];
const subjects = new Set(['matematica', 'fisica', 'quimica']);
const navigationAssets = [
  '<link rel="icon" type="image/png" sizes="180x180" href="/assets/icons/favicon.png?v=20261027-6">',
  '<link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/favicon.png?v=20261027-6">',
  '<link rel="stylesheet" href="/assets/css/theme.css" data-study-navigation>',
  '<script src="/assets/js/theme.js" data-study-navigation></script>',
  '<link rel="stylesheet" href="/assets/css/module-navigation.css" data-study-navigation>',
  '<script src="/assets/js/module-navigation.js" defer data-study-navigation></script>'
].join('\n  ');

await import(pathToFileURL(path.join(root, 'scripts/generate-catalog.mjs')));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

async function copyEntry(source, destination, topLevel) {
  const entries = await readdir(source, { withFileTypes: true });
  await mkdir(destination, { recursive: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyEntry(sourcePath, destinationPath, topLevel);
    } else if (entry.isFile()) {
      const isModule = subjects.has(topLevel) && entry.name.toLocaleLowerCase('pt-BR').endsWith('.html');
      if (isModule) {
        const html = await readFile(sourcePath, 'utf8');
        const enhanced = html.includes('data-study-navigation')
          ? html
          : html.replace(/<\/head>/i, `  ${navigationAssets}\n</head>`);
        await writeFile(destinationPath, enhanced, 'utf8');
      } else {
        await copyFile(sourcePath, destinationPath);
      }
    }
  }
}

for (const entry of publicEntries) {
  const source = path.join(root, entry);
  const destination = path.join(output, entry);
  if (entry.endsWith('.html')) await copyFile(source, destination);
  else await copyEntry(source, destination, entry);
}

for (const subject of subjects) {
  await copyFile(path.join(root, 'index.html'), path.join(output, `${subject}.html`));
}

console.log(`Site gerado em ${path.relative(root, output)}/.`);
