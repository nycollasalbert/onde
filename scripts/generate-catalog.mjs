import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(projectRoot, 'data', 'materiais.json');
const configPath = path.join(projectRoot, 'data', 'materiais.config.json');
const subjects = { matematica: 'Matemática', fisica: 'Física', quimica: 'Química' };
const typePatterns = [
  [/quest(?:ao|oes)|questionario|lista|exercicios?/i, 'Exercícios'],
  [/guia|manual/i, 'Guia'],
  [/revisao|resumo/i, 'Revisão'],
  [/introducao|modulo/i, 'Módulo']
];
const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => entities[entity] || entity);
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function metaContent(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameFirst = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
    const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i');
    const match = html.match(nameFirst) || html.match(contentFirst);
    if (match) return textContent(match[1]);
  }
  return '';
}

function tagContent(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? textContent(match[1]) : '';
}

function titleFromFilename(filename) {
  return path.basename(filename, path.extname(filename))
    .replace(/^(?:modulo[_-])?(?:matematica|fisica|quimica)[_-]?/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('pt-BR'))
    .trim();
}

function inferType(filename, explicitType) {
  if (explicitType) return explicitType;
  return typePatterns.find(([pattern]) => pattern.test(filename))?.[1] || 'Material';
}

function inferTopic(filename, title, explicitTopic) {
  if (explicitTopic) return explicitTopic;
  const withoutType = titleFromFilename(filename)
    .replace(/\b(Guia|Manual|Quest(?:ao|oes)|Questionario|Lista|Exercicios?|Revisao|Resumo|Introducao|Modulo)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return withoutType || title || 'Conteúdo geral';
}

function descriptionFromHtml(html, title, topic, subjectLabel) {
  const meta = metaContent(html, ['description', 'material:description']);
  if (meta) return meta;
  const paragraph = tagContent(html, 'p');
  if (paragraph) return paragraph.length > 180 ? `${paragraph.slice(0, 177).trim()}…` : paragraph;
  return `${topic || title} — material de ${subjectLabel}.`;
}

async function walk(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await walk(target));
      else if (entry.isFile() && entry.name.toLocaleLowerCase('pt-BR').endsWith('.html')) files.push(target);
    }
    return files;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function loadConfig() {
  try {
    await access(configPath);
    return JSON.parse(await readFile(configPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Não foi possível ler ${path.relative(projectRoot, configPath)}: ${error.message}`);
  }
}

const config = await loadConfig();
const materials = [];
for (const [subject, subjectLabel] of Object.entries(subjects)) {
  const files = await walk(path.join(projectRoot, subject));
  for (const file of files) {
    const relativePath = path.relative(projectRoot, file).split(path.sep).join('/');
    const override = config[relativePath] || {};
    if (override.hidden === true) continue;
    const html = await readFile(file, 'utf8');
    const fallbackTitle = titleFromFilename(file) || subjectLabel;
    const title = override.title || metaContent(html, ['material:title', 'og:title']) || tagContent(html, 'h1') || tagContent(html, 'title') || fallbackTitle;
    const topic = inferTopic(file, title, override.topic || metaContent(html, ['material:topic', 'material:assunto', 'topic']));
    const type = inferType(file, override.type || metaContent(html, ['material:type', 'material:tipo']));
    materials.push({
      id: relativePath,
      title,
      subject,
      subjectLabel,
      topic,
      description: override.description || descriptionFromHtml(html, title, topic, subjectLabel),
      type,
      url: encodeURI(relativePath)
    });
  }
}

materials.sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR') || a.topic.localeCompare(b.topic, 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR'));
await writeFile(catalogPath, `${JSON.stringify(materials, null, 2)}\n`, 'utf8');
console.log(`Catálogo gerado: ${materials.length} ${materials.length === 1 ? 'material' : 'materiais'}.`);
