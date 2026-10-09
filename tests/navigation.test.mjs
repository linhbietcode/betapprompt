import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {surface} from './surface.mjs';

let js='';
for(const module of ['catalog','gemini-errors','recommendation','illustration','app']) {
  js+=(await readFile(new URL(`../public/${module}.mjs`,import.meta.url),'utf8'))
    .replace(/^import[^\n]+\n/gm,'').replace(/^export /gm,'')+'\n';
}
function app(legacyData){const s=surface();if(legacyData)s.memory.set('vietphuc-remix-v2',JSON.stringify(legacyData));vm.runInContext(js,s.context);return s;}
const saved=s=>JSON.parse(s.memory.get('vietphuc-remix-v2'));
const modal=s=>s.elements.get('#modal');

test('choosing a new garment always opens the occasion step, including a saved occasion',async()=>{
  const s=app();
  s.location.hash='#studio';
  await s.change('studioOccasion','school');
  s.location.hash='#explore';
  await s.click('detail',{id:'tuthan'});
  assert.match(modal(s).innerHTML,/<img src="art\/tuthan-reference.jpg"/);
  assert.doesNotMatch(modal(s).innerHTML,/<svg/);
  await s.click('detailTab',{id:'illustration'});
  assert.match(modal(s).innerHTML,/<svg/);
  await s.click('chooseGarment',{id:'tuthan'});
  assert.equal(s.location.hash,'#occasion');
  assert.equal(modal(s).open,false);
  assert.equal(saved(s).state.garment,'tuthan');
  assert.equal(saved(s).garmentPinned,true);
  assert.match(s.html(),/Dáng đã chọn:/);
  await s.click('occasion',{id:'tet'});
  await s.click('continue');
  assert.equal(s.location.hash,'#studio');
  assert.equal(saved(s).state.garment,'tuthan');
});

test('occasion step supports an unpinned garment and empty lookbook starts at exploration',async()=>{
  const s=app();
  s.location.hash='#lookbook';
  assert.match(s.html(),/href="#explore"[^>]*>Tạo bộ phối đầu tiên/);
  s.location.hash='#occasion';
  assert.match(s.html(),/Chưa chọn dáng áo/);
  assert.doesNotMatch(s.html(),/Dáng đã chọn:/);
  await s.click('occasion',{id:'walk'});
  assert.equal(saved(s).state.garment,'baba');
  await s.click('continue');
  assert.equal(s.location.hash,'#studio');
  assert.equal(saved(s).garmentPinned,false);
});

test('folds retain their state while editing, double click toggles once, information dialogs close',async()=>{
  const s=app();s.location.hash='#studio';
  assert.doesNotMatch(s.html(),/class="details-fold control-fold" open/);
  await s.click('toggleFold',{id:'color'});
  assert.equal(s.elements.get('#fold-color').open,true);
  await s.click('toggleFold',{id:'color'},2);
  assert.equal(s.elements.get('#fold-color').open,true);
  await s.click('color',{key:'color',id:'lilac'});
  assert.match(s.html(),/class="details-fold control-fold" open><summary data-action="toggleFold" data-id="color"/);
  assert.equal(saved(s).state.color,'lilac');
  await s.click('toggleFold',{id:'color'});
  assert.equal(s.elements.get('#fold-color').open,false);
  await s.click('toggleFold',{id:'accessories'});
  await s.click('accessory',{id:'none'});
  assert.match(s.html(),/class="details-fold control-fold" open><summary data-action="toggleFold" data-id="accessories"/);
  assert.deepEqual(saved(s).state.accessories,[]);
  await s.click('garmentInfo');assert.equal(modal(s).open,true);
  assert.match(modal(s).innerHTML,/Một chút về dáng áo/);
  await s.click('close');assert.equal(modal(s).open,false);
  await s.click('stylingInfo');assert.equal(modal(s).open,true);
  assert.match(modal(s).innerHTML,/Phối có hiểu biết/);
  await s.click('close');assert.equal(modal(s).open,false);
});

test('comparison still has three selectable presets and about shows bullet notes',async()=>{
  const s=app();s.location.hash='#studio';
  await s.change('studioOccasion','tet');
  await s.click('compare');
  assert.equal(s.location.hash,'#compare');
  assert.equal((s.html().match(/class="look-card"/g)||[]).length,3);
  await s.click('pick',{index:'1'});
  assert.equal(s.location.hash,'#result');
  await s.click('about');
  assert.match(modal(s).innerHTML,/Ghi chú từ nhóm phát triển/);
  assert.match(modal(s).innerHTML,/<ul class="developer-list">/);
  assert.match(modal(s).innerHTML,/Ảnh do người phát triển và mã nguồn gốc cung cấp\./);
});

test('older saved looks remain usable after removing weather, without stale weather advice',async()=>{
  const oldSet={garment:'baba',occasion:'walk',style:'minimal',color:'sage',accent:'ivory',accessories:['sandal'],avatar:'medium',hair:'bun',weather:'rain'};
  const s=app({state:oldSet,book:[{id:'old-look',set:oldSet}],garmentPinned:true});
  assert.equal('weather' in saved(s).state,false);
  assert.equal('weather' in saved(s).book[0].set,false);
  s.location.hash='#studio';
  assert.doesNotMatch(s.html(),/id="weather"|Thời tiết|thời tiết/);
  await s.click('garmentInfo');
  assert.match(modal(s).innerHTML,/Câu chuyện dáng áo/);
  assert.match(modal(s).innerHTML,/class="note-footer"/);
  await s.click('close');
  await s.click('stylingInfo');
  assert.match(modal(s).innerHTML,/class="note-color-pair"/);
  assert.doesNotMatch(modal(s).innerHTML,/Có mưa:|Trời nóng:|Trời lạnh:/);
  await s.click('close');
  s.location.hash='#lookbook';
  await s.click('restore',{index:'0'});
  assert.equal(s.location.hash,'#studio');
  assert.equal(saved(s).state.garment,'baba');
  assert.equal(saved(s).state.color,'sage');
  assert.deepEqual(saved(s).state.accessories,['sandal']);
});
