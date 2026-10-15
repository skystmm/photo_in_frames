import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSpots, seasonForMonth, navigationUrl, toggleSaved } from '../src/catalog.js';

const sample = [
  { id: 'lotus', name: '曲院风荷', months: [6, 7, 8], tags: ['花卉', '湖景'], area: '西湖', subject: '夏日荷花' },
  { id: 'maple', name: '九溪烟树', months: [11, 12], tags: ['山林', '秋色'], area: '西湖群山', subject: '红枫溪流' },
  { id: 'canal', name: '小河直街', months: [1,2,3,4,5,6,7,8,9,10,11,12], tags: ['人文'], area: '运河', subject: '水乡街巷' }
];
test('月份和题材共同筛选，支持搜索题材与地区', () => {
  assert.deepEqual(selectSpots(sample, { month: 7, tag: '花卉' }).map(s => s.id), ['lotus']);
  assert.deepEqual(selectSpots(sample, { month: 11, query: '红枫' }).map(s => s.id), ['maple']);
  assert.deepEqual(selectSpots(sample, { month: 11, query: '运河' }).map(s => s.id), ['canal']);
  assert.deepEqual(selectSpots(sample, { month: 7, tag: '秋色' }), []);
});
test('收藏视图仍遵循当前筛选条件', () => {
  assert.deepEqual(selectSpots(sample, { month: 7, onlySaved: true, saved: ['maple', 'canal'] }).map(s => s.id), ['canal']);
});
test('四季覆盖十二个月，参数越界明确拒绝', () => {
  assert.equal(seasonForMonth(1), 'winter');
  assert.equal(seasonForMonth(4), 'spring');
  assert.equal(seasonForMonth(7), 'summer');
  assert.equal(seasonForMonth(10), 'autumn');
  assert.throws(() => seasonForMonth(13), RangeError);
});
test('导航使用杭州限定的地点搜索，避免示意坐标误作导航坐标', () => {
  const url = new URL(navigationUrl({ name: '九溪烟树' }));
  assert.equal(url.hostname, 'uri.amap.com');
  assert.equal(url.searchParams.get('keyword'), '杭州 九溪烟树');
});
test('收藏可切换、去重，且不修改输入', () => {
  const old = ['lotus'];
  assert.deepEqual(toggleSaved(old, 'maple'), ['lotus', 'maple']);
  assert.deepEqual(toggleSaved(old, 'lotus'), []);
  assert.deepEqual(old, ['lotus']);
});
