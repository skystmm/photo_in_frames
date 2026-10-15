import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spots, photos, sources, routes, monthNotes } from '../src/data.js';
import { selectSpots } from '../src/catalog.js';

test('每个机位绑定该地点的独立实景照片，不允许通用氛围图或同图串用', async () => {
  const used = new Set();
  for (const spot of spots) {
    const photo = photos[spot.photo];
    assert.equal(photo.placeId, spot.id, `${spot.name}必须使用已核对为该地点的照片`);
    assert.ok(photo.evidence && photo.imageUrl && photo.checkedAt, `${spot.name}必须记录核对依据与原图`);
    assert.ok(!/氛围|非该|非杭州/.test(photo.label), `${spot.name}不得回退到氛围图`);
    const contents = await readFile(new URL(`../${photo.file}`, import.meta.url));
    const isJpeg = photo.file.endsWith('.jpg') && contents[0] === 0xff && contents[1] === 0xd8;
    const isPng = photo.file.endsWith('.png') && contents.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    assert.ok(isJpeg || isPng, `${spot.name}图片内容和扩展名必须匹配，不能是下载错误页`);
    const digest = createHash('sha256').update(contents).digest('hex');
    assert.ok(!used.has(digest), `${spot.name}不得复用其他机位的照片`);
    used.add(digest);
  }
  for (const route of routes) {
    assert.ok(route.stops.some(([id]) => id === photos[route.photo].placeId), '路线封面必须拍自沿途机位');
  }
});

test('十八个机位无重复，十二个月均有可执行的拍摄建议', () => {
  assert.equal(spots.length, 18);
  assert.equal(new Set(spots.map(s=>s.id)).size, 18);
  assert.equal(monthNotes.length,12);
  for(let month=1;month<=12;month++) {
    const selected=selectSpots(spots,{month});
    assert.ok(selected.length>=3,`${month}月应至少有三个机位`);
    assert.ok(selected.some(s=>s.months.length<12),`${month}月应有季节机位`);
  }
  for(const spot of spots) {
    for(const field of ['frame','phone','time','light','lens','window','access','subject'])assert.ok(spot[field]?.length,`${spot.id} 缺少 ${field}`);
    assert.ok(sources[spot.source],`${spot.id} 缺少来源`);
    assert.ok(photos[spot.photo],`${spot.id} 缺少照片`);
    assert.ok(spot.months.every(m=>Number.isInteger(m)&&m>=1&&m<=12));
    assert.ok(spot.lat>30.175&&spot.lat<30.329&&spot.lng>120.045&&spot.lng<120.255,`${spot.id} 应在地图范围内`);
  }
});
test('深秋彩叶与盛夏荷花不会错误地出现在十月与一月', () => {
  assert.ok(!selectSpots(spots,{month:10}).some(s=>s.id==='beishan'||s.id==='meiling'));
  assert.ok(selectSpots(spots,{month:12}).some(s=>s.id==='meiling'));
  assert.ok(!selectSpots(spots,{month:1}).some(s=>s.id==='quyuan'));
  assert.ok(selectSpots(spots,{month:7}).some(s=>s.id==='quyuan'));
});
test('所有摄影资产位于本地且保留来源，每条路线连接有效机位', async () => {
  for(const photo of Object.values(photos)) {
    await access(new URL(`../${photo.file}`,import.meta.url));
    assert.ok(new URL(photo.url).protocol==='https:');
    assert.ok(photo.by&&photo.label);
  }
  for(const route of routes)for(const [id,label] of route.stops){assert.ok(spots.some(s=>s.id===id));assert.ok(label);}
  for(const source of Object.values(sources))assert.equal(new URL(source.url).protocol,'https:');
});
