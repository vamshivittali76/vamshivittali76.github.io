#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const INDEX_FILE = path.join(POSTS_DIR, 'index.json');

const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
  Usage: node new-post.js <title> [options]

  Options:
    --tags    Comma-separated tags (default: "General")
    --time    Read time (default: "3 min read")
    --excerpt Short excerpt/summary
    --content Paragraphs separated by |||

  Examples:
    node new-post.js "My Post Title" --tags "AI,MCP" --excerpt "A short summary" --content "First paragraph|||Second paragraph"
    node new-post.js "Quick Thought" --tags "Building" --excerpt "Something I noticed today"

  Interactive mode (no --content flag):
    Launches with just metadata, you edit the JSON file directly to add content.
  `);
  process.exit(0);
}

const title = args[0];
const getFlag = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};

const tags = getFlag('--tags') ? getFlag('--tags').split(',').map(t => t.trim()) : ['General'];
const readTime = getFlag('--time') || '3 min read';
const excerpt = getFlag('--excerpt') || title;
const contentRaw = getFlag('--content');
const content = contentRaw ? contentRaw.split('|||').map(p => p.trim()) : [''];

const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));

const maxId = index.reduce((max, p) => Math.max(max, parseInt(p.id, 10)), 0);
const newId = String(maxId + 1).padStart(3, '0');

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 60);

const today = new Date().toISOString().split('T')[0];
const fileName = `${newId}-${slug}.json`;

const post = {
  id: newId,
  slug,
  date: today,
  title,
  excerpt,
  readTime,
  tags,
  content,
};

fs.writeFileSync(path.join(POSTS_DIR, fileName), JSON.stringify(post, null, 2));

const indexEntry = {
  id: newId,
  slug,
  date: today,
  title,
  excerpt,
  readTime,
  tags,
  file: fileName,
};

index.unshift(indexEntry);
fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

console.log(`\n  Post created: posts/${fileName}`);
console.log(`  Index updated: ${index.length} total posts`);
console.log(`  ID: #${newId} | Slug: ${slug}`);
console.log(`\n  Edit the JSON file to add/modify content paragraphs.\n`);
