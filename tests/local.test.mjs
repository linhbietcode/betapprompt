import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {readGeminiConfig} from '../server/config.mjs';
import {createDemoServer,publicFilePath} from '../local-server.mjs';
import {studioCandidates} from '../public/recommendation.mjs';
import {makeSet} from '../public/catalog.mjs';
import {surface} from './surface.mjs';

function callServer(server, url, init) {
  return new Promise(resolve => {
    const req = Readable.from(init?.body ? [Buffer.from(init.body)] : []);
    Object.assign(req, {url,method:init?.method ?? 'GET',headers:{...init?.headers,'cf-connecting-ip':'test-local'}});
    const res = {status:200,headers:{},writeHead(status, headers={}){this.status=status;this.headers=headers},end(body=''){resolve(new Response(body,{status:this.status,headers:this.headers}))}};
    server.emit('request', req, res);
  });
}
test('configuration reads the edited placeholder file; missing/unchanged key stays unconfigured', async () => {
  assert.equal(readGeminiConfig(undefined,{}).GEMINI_API_KEY, undefined);
  const temp = await mkdtemp(path.join(os.tmpdir(),'vietphuc-config-'));
  try {
    const file=path.join(temp,'gemini.env');
    await writeFile(file,'GEMINI_API_KEY="test-only-secret"\r\nGEMINI_MODEL=gemini-3.5-flash-lite\r\n');
    assert.equal(readGeminiConfig(file,{}).GEMINI_API_KEY,'test-only-secret');
    assert.equal(readGeminiConfig(path.join(temp,'missing'),{}).GEMINI_API_KEY,undefined);
    assert.equal(readGeminiConfig(path.join(temp,'missing'),{GEMINI_API_KEY:'hosting-secret'}).GEMINI_API_KEY,'hosting-secret');
  } finally { await rm(temp,{recursive:true,force:true}); }
});
test('HTTP handlers keep config private and use only the server key', async () => {
  let calls=0;
  const context=makeSet('aodai','school','elegant');
  const server=createDemoServer({GEMINI_API_KEY:'server-test-secret'},async(url,init)=>{
    calls++; assert.equal(init.headers['x-goog-api-key'],'server-test-secret');
    return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({candidateId:studioCandidates(context,'tím khói').find(x=>x.set.color==='lilac').id,explanation:'Chọn tím khói theo mong muốn của bạn.'})}]}}]});
  });
  assert.deepEqual(await (await callServer(server,'/api/recommend')).json(),{configured:true});
  assert.equal((await callServer(server,'/gemini.env')).status,404);
  assert.equal(publicFilePath('/../gemini.env'),null);
  assert.equal(publicFilePath('/%2e%2e/gemini.env'),null);
  assert.equal(publicFilePath('/%2e%2e%5cgemini.env'),null);
  assert((await (await callServer(server,'/fonts/vietphuc-serif.woff')).arrayBuffer()).byteLength>1000);
  const response=await callServer(server,'/api/recommend',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context,text:'tím khói',mode:'studio',apiKey:'client-override',model:'wrong'})});
  assert.equal(response.status,200); assert.equal((await response.json()).set.color,'lilac'); assert.equal(calls,1);
  const html=await (await callServer(server,'/')).text(); assert(!html.includes('Kết nối Gemini')); assert(!html.includes('server-test-secret'));
});
test('actual UI -> local HTTP handler -> mocked Gemini: no key entry, preview, apply and lookbook', async () => {
  let js='';
  for(const module of ['catalog','gemini-errors','recommendation','illustration','app']) {
    js+=(await readFile(new URL(`../public/${module}.mjs`,import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'')+'\n';
  }
  assert(!js.includes('function settings(')); assert(!js.includes('x-goog-api-key'));
  let fail=false; let upstreamCalls=0;
  const server=createDemoServer({GEMINI_API_KEY:'test-only-key'},async(url,init)=>{
    upstreamCalls++;
    if(fail)return Response.json({error:{message:'Rejected test-only-key',status:'API_KEY_INVALID'}},{status:400});
    const prompt=JSON.parse(init.body).contents[0].parts[0].text;
    const choices=JSON.parse(prompt.split('Các phương án: ')[1].split('. Mô tả sau')[0]);
    return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({candidateId:choices.find(x=>x.color==='lilac').id,explanation:'Tím khói theo mô tả, kết hợp màu nhấn nhẹ.'})}]}}]});
  });
  const calls=[]; const s=surface(async(url,init)=>{assert.equal(url,'/api/recommend'); calls.push(init); assert(!JSON.stringify(init).includes('test-only-key')); return callServer(server,url,init)},'http:');
  vm.runInContext(js,s.context); s.location.hash='#studio'; await s.change('studioOccasion','school');
  s.input('assistantText','mình thích tím khói'); await s.click('ask');
  assert(s.html().includes('Gemini · đã kết nối thành công')); assert(s.html().includes('Tím khói theo mô tả'));
  assert.notEqual(JSON.parse(s.memory.get('vietphuc-remix-v2')).state.color,'lilac');
  await s.click('apply'); assert.equal(JSON.parse(s.memory.get('vietphuc-remix-v2')).state.color,'lilac');
  await s.click('save'); s.location.hash='#lookbook'; assert(s.html().includes('class="look-card"'));
  await s.click('export'); await s.click('exportJSON'); assert(s.downloads.includes('lookbook-viet-phuc.json'));
  s.location.hash='#studio'; fail=true; await s.click('ask');
  assert(s.html().includes('Google không chấp nhận khóa')); assert(s.html().includes('gợi ý dự phòng theo quy tắc')); assert(!s.html().includes('test-only-key'));
  assert.equal(upstreamCalls,2); assert(!JSON.stringify([...s.memory]).includes('test-only-key'));
  const noKey=createDemoServer({}); const response=await callServer(noKey,'/api/recommend',{method:'POST',body:JSON.stringify({context:makeSet('aodai','school','elegant'),text:'tươi tắn',mode:'studio'})});
  assert.equal(response.status,503); assert.equal((await response.json()).error,'gemini_not_configured');
});
