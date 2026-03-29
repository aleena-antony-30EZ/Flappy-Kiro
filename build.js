// build.js — production build script
// Minifies index.html (including inline JS/CSS) into dist/index.html
// Copies assets/ into dist/assets/ unchanged (Vercel CDN handles compression)

import { minify } from 'html-minifier-terser';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { join } from 'path';

const SRC  = 'index.html';
const DIST = 'dist';

const html = readFileSync(SRC, 'utf8');

// Inject LEADERBOARD_API from env (set in Vercel project settings)
const apiBase = process.env.LEADERBOARD_API || '';
const htmlWithApi = html.replace(
  "typeof LEADERBOARD_API !== 'undefined' && LEADERBOARD_API",
  JSON.stringify(apiBase) + ' || false'
);

const minified = await minify(htmlWithApi, {
  collapseWhitespace:    true,
  removeComments:        true,
  minifyCSS:             true,
  minifyJS:              {
    compress: { drop_console: false },  // keep console.warn for asset failures
    mangle:   true
  },
  removeAttributeQuotes: true,
  removeRedundantAttributes: true,
  useShortDoctype:       true
});

mkdirSync(DIST, { recursive: true });
writeFileSync(join(DIST, 'index.html'), minified, 'utf8');

// Copy assets folder
cpSync('assets', join(DIST, 'assets'), { recursive: true });

// Copy PWA files (sw.js must be at root scope; manifest.json referenced from HTML)
cpSync('sw.js',        join(DIST, 'sw.js'));
cpSync('manifest.json', join(DIST, 'manifest.json'));

const savings = (((html.length - minified.length) / html.length) * 100).toFixed(1);
console.log(`Built dist/index.html — ${minified.length} bytes (${savings}% smaller)`);
