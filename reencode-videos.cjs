// Re-encode all hero-v2 videos with every-frame keyframes for instant seeking.
// Uses Intra-only H.264 encoding: -g 1 makes every frame a keyframe.
// Output to hero-v2-scrub/ alongside originals.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');

const inputDir = 'assets/videos/hero-v2';
const outputDir = 'assets/videos/hero-v2-scrub';

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.mp4')).sort();

console.log(`Re-encoding ${files.length} videos with every-frame keyframes...\n`);
console.log(`ffmpeg: ${ffmpeg}\n`);

files.forEach((name, i) => {
  const input = path.join(inputDir, name);
  const output = path.join(outputDir, name);

  if (fs.existsSync(output)) {
    console.log(`[${i+1}/${files.length}] SKIP (exists): ${name}`);
    return;
  }

  console.log(`[${i+1}/${files.length}] Encoding: ${name} ...`);
  const start = Date.now();

  try {
    // -g 1: keyframe every frame (intra-only)
    // -c:v libx264: H.264 codec
    // -preset fast: reasonable speed
    // -crf 18: high quality (visually lossless)
    // -an: drop audio (not needed for scroll scrubbing)
    // -movflags +faststart: enable streaming/seeking from start
    const cmd = `"${ffmpeg}" -i "${input}" -c:v libx264 -g 1 -keyint_min 1 -preset fast -crf 18 -pix_fmt yuv420p -an -movflags +faststart -y "${output}"`;
    execSync(cmd, { encoding: 'utf8', timeout: 300000, stdio: 'pipe' });

    const inSize = (fs.statSync(input).size / 1024 / 1024).toFixed(1);
    const outSize = (fs.statSync(output).size / 1024 / 1024).toFixed(1);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  Done in ${elapsed}s. ${inSize}MB -> ${outSize}MB`);
  } catch (e) {
    console.log(`  ERROR: ${e.message.slice(0, 200)}`);
  }
});

console.log('\nAll done. Now verifying keyframes in output...\n');

// Verify
const fp = require('ffprobe-static').path;
const outFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp4')).sort();
outFiles.forEach(name => {
  const src = path.join(outputDir, name);
  try {
    const cmd = `"${fp}" -v error -select_streams v:0 -show_packets -show_entries packet=flags -of csv=p=0 "${src}"`;
    const r = execSync(cmd, { encoding: 'utf8', timeout: 60000, maxBuffer: 50*1024*1024 });
    const lines = r.trim().split(/\r?\n/).filter(l => l.trim());
    const kf = lines.filter(l => l.includes('K'));
    console.log(`${name.padEnd(35)} ${lines.length} frames, ${kf.length} keyframes (${kf.length === lines.length ? 'ALL INTRA ✓' : 'PARTIAL ✗'})`);
  } catch(e) {
    console.log(`${name}: verify error`);
  }
});
