#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const root = resolve(process.cwd());
const ignoredDirectories = new Set(['.git', '.github', 'node_modules', 'scripts']);
const htmlFiles = [];
const failures = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') htmlFiles.push(path);
  }
}

function fail(file, message) {
  failures.push(`${relative(root, file)}: ${message}`);
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? null;
}

function localCandidates(fromFile, reference) {
  const clean = decodeURIComponent(reference.split('#', 1)[0].split('?', 1)[0]);
  const target = clean.startsWith('/')
    ? join(root, clean.replace(/^\/+/, ''))
    : resolve(dirname(fromFile), clean);

  if (!target.startsWith(`${root}${sep}`) && target !== root) return [];
  if (clean.endsWith('/')) return [join(target, 'index.html')];
  if (extname(target)) return [target];
  return [target, `${target}.html`, join(target, 'index.html')];
}

function validateReference(file, tag, name) {
  const reference = attribute(tag, name);
  if (!reference || reference.startsWith('#')) return;
  if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) return;
  if (/^(?:javascript:|vbscript:)/i.test(reference)) {
    fail(file, `${name} uses an executable URL: ${reference}`);
    return;
  }
  if (reference.startsWith('//')) {
    fail(file, `${name} uses a protocol-relative URL: ${reference}`);
    return;
  }

  let candidates;
  try {
    candidates = localCandidates(file, reference);
  } catch {
    fail(file, `${name} contains an invalid encoded path: ${reference}`);
    return;
  }
  if (candidates.length > 0 && !candidates.some(existsSync)) {
    fail(file, `${name} references a missing local artifact: ${reference}`);
  }
}

function validateHtml(file) {
  const html = readFileSync(file, 'utf8');

  if (!/^<!doctype html>/i.test(html.trimStart())) fail(file, 'missing HTML5 doctype');
  if (!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html)) fail(file, 'missing html lang attribute');
  if (!/<meta\b[^>]*\bcharset\s*=\s*["']?utf-8/i.test(html)) fail(file, 'missing UTF-8 charset metadata');
  if (!/<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>/i.test(html)) fail(file, 'missing viewport metadata');
  if (!/<meta\b[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/i.test(html)) {
    fail(file, 'missing Content Security Policy metadata');
  }
  if (/^(?:<<<<<<<|=======|>>>>>>>)/m.test(html)) fail(file, 'contains an unresolved conflict marker');
  if (/\b(?:ghp_|github_pat_|sk_live_|xox[baprs]-|SG\.)[A-Za-z0-9_\-.]{12,}/.test(html)) {
    fail(file, 'contains a value resembling a secret token');
  }
  if (/\b(?:href|src)\s*=\s*["']http:\/\//i.test(html)) fail(file, 'contains an insecure HTTP resource URL');

  for (const tag of html.matchAll(/<a\b[^>]*>/gi)) {
    const value = tag[0];
    const href = attribute(value, 'href');
    const target = attribute(value, 'target');
    const rel = attribute(value, 'rel') ?? '';
    if (target?.toLowerCase() === '_blank' && !/\bnoopener\b/i.test(rel)) {
      fail(file, `external/new-tab link lacks rel="noopener": ${href ?? '<missing href>'}`);
    }
    validateReference(file, value, 'href');
  }

  for (const tag of html.matchAll(/<(?:img|script|link|source)\b[^>]*>/gi)) {
    const value = tag[0];
    if (/^<link\b/i.test(value)) validateReference(file, value, 'href');
    else validateReference(file, value, 'src');
  }
}

walk(root);
htmlFiles.sort();

if (htmlFiles.length === 0) failures.push('repository: no HTML artifacts found');
if (!existsSync(join(root, 'index.html'))) failures.push('repository: root index.html is missing');

for (const file of htmlFiles) {
  if (!statSync(file).isFile()) continue;
  validateHtml(file);
}

if (failures.length > 0) {
  console.error(`Static site validation failed with ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlFiles.length} HTML artifact(s) with no structural, link, privacy, or conflict-marker failures.`);
}
