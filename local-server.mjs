// Local demo only. Node.js 22+, no dependencies.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {handleRecommend} from './server/gemini.mjs';
import {readGeminiConfig} from './server/config.mjs';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff':'font/woff'};
export function publicFilePath(pathname) {
  const relative = decodeURIComponent(pathname === '/' ? '/demo.html' : pathname);
  const file = path.resolve(root, '.' + relative);
  if (!file.startsWith(root) || relative.includes('\0') || relative.includes('\\')) return null;
  return file;
}
export function createDemoServer(config = readGeminiConfig(), fetcher = fetch) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost:3000');
      if (url.pathname === '/api/recommend') {
        const chunks = []; let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 12000) { res.writeHead(413); res.end(); return; }
          chunks.push(chunk);
        }
        const request = new Request(url, {method:req.method, headers:req.headers, ...(req.method === 'POST' ? {body:Buffer.concat(chunks).toString()} : {})});
        const reply = await handleRecommend(request, config, fetcher);
        res.writeHead(reply.status, Object.fromEntries(reply.headers));
        res.end(await reply.text()); return;
      }
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const file = publicFilePath(url.pathname);
      if (!file) { res.writeHead(403); res.end(); return; }
      const data = await readFile(file);
      res.writeHead(200, {'Content-Type':types[path.extname(file)] ?? 'application/octet-stream'});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const config = readGeminiConfig();
    const server = createDemoServer(config);
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE' ? 'Cong 3000 dang duoc dung. Dong ban demo cu roi chay lai.' : 'Khong khoi dong duoc may chu.');
      process.exitCode = 1;
    });
    server.listen(3000, '127.0.0.1', () => {
      console.log('Viet phuc Remix: http://localhost:3000');
      console.log(config.GEMINI_API_KEY ? 'Da doc cau hinh Gemini. Gui mo ta tren web de kiem tra ket noi.' : 'Chua dien khoa Gemini: sua gemini.env roi khoi dong lai.');
      console.log('Giu cua so nay mo. Nhan Ctrl+C de dung.');
      if (process.argv.includes('--open')) {
        const url = 'http://localhost:3000';
        const [command,args] = process.platform === 'win32' ? ['cmd.exe',['/c','start','',url]] : process.platform === 'darwin' ? ['open',[url]] : ['xdg-open',[url]];
        const child = spawn(command, args, {stdio:'ignore', detached:true});
        child.on('error', () => console.log('Mo trinh duyet tai http://localhost:3000')); child.unref();
      }
    });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
