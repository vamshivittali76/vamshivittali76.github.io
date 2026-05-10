#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LAB_FILE = path.join(__dirname, '..', 'lab-status.json');
const TOKIE_DB = path.join(process.env.USERPROFILE || process.env.HOME, '.tokie', 'tokie.db');

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
  Usage: node update-lab.js [options]

  Modes:
    --set <label> <value>    Set a specific lab entry
    --auto                   Auto-gather from AI apps (Tokie DB, git activity)
    --show                   Display current lab status

  Examples:
    node update-lab.js --set shipping "Levlr v2 (multi-tenant)"
    node update-lab.js --set learning "Rust + WebAssembly"
    node update-lab.js --set reading "Building LLM Apps by Chip Huyen"
    node update-lab.js --auto
    node update-lab.js --show
  `);
  process.exit(0);
}

const lab = JSON.parse(fs.readFileSync(LAB_FILE, 'utf8'));

if (args.includes('--show')) {
  console.log('\n  Current Lab Status:\n');
  lab.entries.forEach(e => {
    console.log(`  [${e.year}] ${e.label.padEnd(12)} → ${e.value}`);
  });
  console.log(`\n  Last updated: ${lab.lastUpdated}\n`);
  process.exit(0);
}

if (args.includes('--set')) {
  const setIdx = args.indexOf('--set');
  const label = args[setIdx + 1];
  const value = args[setIdx + 2];

  if (!label || !value) {
    console.error('  Error: --set requires <label> <value>');
    process.exit(1);
  }

  const entry = lab.entries.find(e => e.label === label);
  if (entry) {
    entry.value = value;
    entry.year = new Date().getFullYear().toString();
  } else {
    lab.entries.push({ label, value, year: new Date().getFullYear().toString() });
  }

  lab.lastUpdated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(LAB_FILE, JSON.stringify(lab, null, 2));
  console.log(`\n  Updated: [${label}] → ${value}\n`);
  process.exit(0);
}

if (args.includes('--auto')) {
  console.log('\n  Auto-gathering lab data...\n');
  const gathered = [];

  // 1. Check Tokie DB for recent AI usage stats
  if (fs.existsSync(TOKIE_DB)) {
    try {
      const result = execSync(`sqlite3 "${TOKIE_DB}" "SELECT provider, SUM(tokens_used) as total FROM usage WHERE date >= date('now', '-7 days') GROUP BY provider ORDER BY total DESC LIMIT 3;"`, { encoding: 'utf8' });
      if (result.trim()) {
        const providers = result.trim().split('\n').map(l => {
          const [provider, tokens] = l.split('|');
          return `${provider} (${parseInt(tokens).toLocaleString()} tokens)`;
        });
        gathered.push({ source: 'Tokie', data: `Top AI tools this week: ${providers.join(', ')}` });
      }
    } catch (e) {
      gathered.push({ source: 'Tokie', data: 'DB found but could not query' });
    }
  } else {
    gathered.push({ source: 'Tokie', data: 'Not installed or DB not found' });
  }

  // 2. Check recent git activity across known project dirs
  const projectDirs = [
    path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'vamshi-portfolio'),
    path.join(process.env.USERPROFILE || process.env.HOME, 'projects'),
  ];

  projectDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        const log = execSync(`git -C "${dir}" log --oneline -5 --since="7 days ago" 2>/dev/null`, { encoding: 'utf8' });
        if (log.trim()) {
          gathered.push({ source: `Git (${path.basename(dir)})`, data: log.trim().split('\n').length + ' commits this week' });
        }
      } catch (e) {}
    }
  });

  // 3. Check for Claude Code session data
  const claudeDir = path.join(process.env.USERPROFILE || process.env.HOME, '.claude');
  if (fs.existsSync(claudeDir)) {
    try {
      const projects = fs.readdirSync(path.join(claudeDir, 'projects')).length;
      gathered.push({ source: 'Claude Code', data: `${projects} active project contexts` });
    } catch (e) {}
  }

  console.log('  Gathered data:');
  gathered.forEach(g => {
    console.log(`    [${g.source}] ${g.data}`);
  });

  console.log('\n  Lab status file NOT auto-modified (review data above and use --set to update).\n');
  process.exit(0);
}

console.log('  No action specified. Use --help for usage.');
