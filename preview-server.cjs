const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const args=process.argv, i=args.indexOf('--port'),port=i>=0?Number(args[i+1]):4173;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.mp4':'video/mp4','.webm':'video/webm','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'};
http.createServer((req,res)=>{let f;try{f=path.resolve(__dirname,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));}catch{res.writeHead(400);return res.end();}if(!f.startsWith(__dirname+path.sep)&&f!==__dirname){res.writeHead(403);return res.end();}if(f===__dirname||fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
fs.stat(f,(statErr,stat)=>{if(statErr||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
const ct=MIME[path.extname(f)]||'application/octet-stream';
// Range request support for video seeking
const range=req.headers.range;
if(range){const parts=range.replace(/bytes=/,'').split('-');const start=parseInt(parts[0],10);const end=parts[1]?parseInt(parts[1],10):stat.size-1;const chunksize=end-start+1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Accept-Ranges':'bytes','Content-Length':chunksize,'Content-Type':ct});fs.createReadStream(f,{start,end}).pipe(res);}
else{res.writeHead(200,{'Content-Length':stat.size,'Content-Type':ct,'Accept-Ranges':'bytes'});fs.createReadStream(f).pipe(res);}
});}).listen(port,'0.0.0.0',()=>console.log(`Preview server running on http://localhost:${port}`));
