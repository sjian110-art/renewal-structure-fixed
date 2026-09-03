const { execSync } = require('child_process');
const fs = require('fs');
const fp = require('ffprobe-static').path;

const dir = 'assets/videos/hero-v2';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4')).sort();

files.forEach(name => {
  const src = `${dir}/${name}`;
  try {
    const cmd = `"${fp}" -v error -select_streams v:0 -show_packets -show_entries packet=flags,pts_time -of json "${src}"`;
    const r = execSync(cmd, { encoding: 'utf8', timeout: 60000, maxBuffer: 50*1024*1024 });
    const d = JSON.parse(r);
    const pkts = d.packets || [];
    const keyPkts = pkts.filter(p => p.flags && p.flags.includes('K'));
    const dur = pkts.length > 0 ? parseFloat(pkts[pkts.length-1].pts_time) : 0;
    const kfInterval = keyPkts.length > 1 
      ? (parseFloat(keyPkts[keyPkts.length-1].pts_time) / (keyPkts.length-1)).toFixed(1)
      : 'N/A (single KF)';
    console.log(`${name.padEnd(35)} ${pkts.length} frames, ${keyPkts.length} keyframes, dur=${dur.toFixed(1)}s, avg KF interval=${kfInterval}`);
  } catch(e) {
    console.log(`${name}: ERROR - ${e.message.slice(0,100)}`);
  }
});
