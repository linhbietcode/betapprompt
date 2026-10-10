import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createVercelHandler} from '../api/recommend.mjs';
import {makeSet} from '../public/catalog.mjs';
import {studioCandidates} from '../public/recommendation.mjs';

const endpoint='https://vietphuc-example.vercel.app/api/recommend';
test('Vercel adapter reads only hosting secrets, retains same-origin validation and forwards valid results',async()=>{
  const context=makeSet('aodai','school','elegant');
  let calls=0;
  const handler=createVercelHandler({GEMINI_API_KEY:'hosting-test-secret'},async(url,init)=>{
    calls++;assert.equal(init.headers['x-goog-api-key'],'hosting-test-secret');
    return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({candidateId:studioCandidates(context,'tím khói').find(x=>x.set.color==='lilac').id,explanation:'Chọn tím khói theo mô tả.'})}]}}]});
  });
  const status=await handler(new Request(endpoint));
  assert.deepEqual(await status.json(),{configured:true});
  const request=()=>new Request(endpoint,{method:'POST',headers:{origin:new URL(endpoint).origin,'content-type':'application/json','x-vercel-forwarded-for':'192.0.2.123'},body:JSON.stringify({mode:'studio',context,text:'tím khói',apiKey:'browser-override'})});
  const response=await handler(request());
  assert.equal(response.status,200);
  const text=await response.text();assert(!text.includes('hosting-test-secret'));
  assert.equal(JSON.parse(text).set.color,'lilac');assert.equal(calls,1);
  const wrongOrigin=new Request(endpoint,{method:'POST',headers:{origin:'https://other.example'},body:'{}'});
  assert.equal((await handler(wrongOrigin)).status,403);assert.equal(calls,1);
  const missing=createVercelHandler({});
  assert.deepEqual(await (await missing(new Request(endpoint))).json(),{configured:false});
  const noKey=await missing(request());assert.equal(noKey.status,503);
  assert.equal((await noKey.json()).error,'gemini_not_configured');
});

test('public adapter ignores forged identity headers for its best-effort rate limit',async()=>{
  const handler=createVercelHandler({});
  const context=makeSet('aodai','school','elegant');
  for(let i=0;i<16;i++) {
    const req=new Request(endpoint,{method:'POST',headers:{'x-vercel-forwarded-for':'192.0.2.222','oai-authenticated-user-id':'forged-'+i,'cf-connecting-ip':'fake-'+i},body:JSON.stringify({mode:'studio',context,text:'tươi tắn'})});
    assert.equal((await handler(req)).status,i<15?503:429);
  }
});

test('deployment serves only public assets and excludes private local configuration',async()=>{
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.equal(config.outputDirectory,'public');
  assert.deepEqual(config.rewrites,[{source:'/',destination:'/demo.html'}]);
  assert.equal(config.functions['api/recommend.mjs'].maxDuration,30);
  const ignores=await readFile(new URL('../.vercelignore',import.meta.url),'utf8');
  assert(ignores.split('\n').includes('gemini.env'));
  assert(ignores.split('\n').includes('.env*'));
});
