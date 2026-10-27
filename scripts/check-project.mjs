import { access, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const checks = [];
const virtualRoutes = new Set(['/', '/matematica', '/fisica', '/quimica']);

function check(condition, message) {
  if (condition) checks.push(message);
  else failures.push(message);
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !['.git', 'dist', 'node_modules'].includes(entry.name)) files.push(...await htmlFiles(target));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(target);
  }
  return files;
}

const build = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
check(build.status === 0, 'geração do catálogo');
if (build.status !== 0) failures.push(build.stderr.trim());

const required = ['index.html', 'assets/css/styles.css', 'assets/css/theme.css', 'assets/css/module-navigation.css', 'assets/js/app.js', 'assets/js/theme.js', 'assets/js/module-navigation.js', 'data/materiais.json', 'vercel.json', 'dist/index.html', 'dist/matematica.html', 'dist/fisica.html', 'dist/quimica.html', 'dist/assets/css/theme.css', 'dist/assets/js/theme.js', 'dist/data/materiais.json', 'videoaulas/index.html', 'dist/videoaulas/index.html'];
for (const file of required) {
  try {
    await access(path.join(root, file));
    checks.push(`arquivo ${file}`);
  } catch {
    failures.push(`arquivo ausente: ${file}`);
  }
}

const index = await readFile(path.join(root, 'index.html'), 'utf8');
check(index.includes('lang="pt-BR"'), 'idioma da página');
check(index.includes('name="viewport"'), 'viewport responsivo');
check(!/materiaisExemplo|versão de demonstração|integr(aç|ac)ão simulada/i.test(index), 'ausência de conteúdo demonstrativo');
check(!/href="#(?:todos|matematica|fisica|quimica)"/.test(index), 'filtros sem fragmentos na URL');
check(index.includes('data-subject-link="matematica"'), 'filtros de matéria por estado');
check(index.includes('href="/videoaulas/index.html"'), 'módulo de Videoaulas no menu');
const appCode = await readFile(path.join(root, 'assets/js/app.js'), 'utf8');
check(appCode.includes("fetch('/data/materiais.json'"), 'catálogo carregado por caminho absoluto');
check(appCode.includes("card.href = `/"), 'links dos cards começam na raiz');
check(index.includes('href="/matematica"') && index.includes('href="/fisica"') && index.includes('href="/quimica"'), 'rotas limpas para matérias');
check(index.includes('?v=20261027-5'), 'versão de recursos para invalidar cache antigo');

for (const script of ['assets/js/app.js', 'assets/js/theme.js', 'assets/js/module-navigation.js']) {
  const syntax = spawnSync(process.execPath, ['--check', path.join(root, script)], { encoding: 'utf8' });
  check(syntax.status === 0, `sintaxe de ${script}`);
  if (syntax.status !== 0) failures.push(syntax.stderr.trim());
}

check(index.includes('data-theme-toggle'), 'seletor de tema na página inicial');
const builtModule = await readFile(path.join(root, 'dist', catalogModulePath()), 'utf8').catch(() => '');
check(builtModule.includes('/assets/js/theme.js'), 'tema injetado nos módulos');

function catalogModulePath() {
  return 'quimica/modulo_quimica.html';
}

for (const match of index.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  const reference = match[1];
  if (/^(?:https?:|\/\/)/.test(reference)) continue;
  const pathname = decodeURI(reference.split(/[?#]/, 1)[0]);
  if (virtualRoutes.has(pathname)) {
    checks.push(`rota ${pathname}`);
    continue;
  }
  try {
    await access(path.join(root, pathname.replace(/^\//, '')));
    checks.push(`recurso ${reference}`);
  } catch {
    failures.push(`recurso local ausente: ${reference}`);
  }
}

for (const htmlPath of await htmlFiles(root)) {
  const html = await readFile(htmlPath, 'utf8');
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const reference = match[1];
    if (/^(?:#|https?:|\/\/|data:|mailto:|tel:|javascript:)/i.test(reference)) continue;
    const pathname = decodeURI(reference.split(/[?#]/, 1)[0]);
    if (!pathname) continue;
    if (virtualRoutes.has(pathname)) {
      checks.push(`rota ${pathname}`);
      continue;
    }
    try {
      const target = pathname.startsWith('/') ? path.join(root, pathname.slice(1)) : path.resolve(path.dirname(htmlPath), pathname);
      await access(target);
      checks.push(`link ${path.relative(root, htmlPath)} → ${pathname}`);
    } catch {
      failures.push(`link quebrado em ${path.relative(root, htmlPath)}: ${reference}`);
    }
  }
}

const catalog = JSON.parse(await readFile(path.join(root, 'data/materiais.json'), 'utf8'));
check(Array.isArray(catalog), 'formato do catálogo');
for (const material of catalog) {
  try {
    await access(path.join(root, decodeURI(material.url)));
    checks.push(`link ${material.url}`);
  } catch {
    failures.push(`material inexistente no catálogo: ${material.url}`);
  }
}

const subjectFolders = await readdir(root, { withFileTypes: true });
for (const subject of ['matematica', 'fisica', 'quimica']) {
  check(subjectFolders.some((entry) => entry.isDirectory() && entry.name === subject), `pasta ${subject}/`);
}

const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
check(vercel.buildCommand === 'npm run build', 'build da Vercel');
check(vercel.outputDirectory === 'dist', 'diretório de publicação da Vercel');
check(vercel.headers?.[0]?.headers?.[0]?.value === 'public, max-age=0, must-revalidate', 'recursos sem cache imutável');

if (failures.length) {
  console.error(`Falharam ${failures.length} verificações:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`${checks.length} verificações concluídas; ${catalog.length} materiais reais catalogados.`);
