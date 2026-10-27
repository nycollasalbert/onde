import { access, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const checks = [];

function check(condition, message) {
  if (condition) checks.push(message);
  else failures.push(message);
}

const build = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
check(build.status === 0, 'geração do catálogo');
if (build.status !== 0) failures.push(build.stderr.trim());

const required = ['index.html', 'assets/css/styles.css', 'assets/css/module-navigation.css', 'assets/js/app.js', 'assets/js/module-navigation.js', 'data/materiais.json', 'vercel.json', 'dist/index.html', 'dist/data/materiais.json'];
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

for (const script of ['assets/js/app.js', 'assets/js/module-navigation.js']) {
  const syntax = spawnSync(process.execPath, ['--check', path.join(root, script)], { encoding: 'utf8' });
  check(syntax.status === 0, `sintaxe de ${script}`);
  if (syntax.status !== 0) failures.push(syntax.stderr.trim());
}

for (const match of index.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  const reference = match[1];
  if (/^(?:https?:|\/\/)/.test(reference)) continue;
  try {
    await access(path.join(root, reference));
    checks.push(`recurso ${reference}`);
  } catch {
    failures.push(`recurso local ausente: ${reference}`);
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

if (failures.length) {
  console.error(`Falharam ${failures.length} verificações:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`${checks.length} verificações concluídas; ${catalog.length} materiais reais catalogados.`);
