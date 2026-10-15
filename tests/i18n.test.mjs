import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale, translateText, searchSpots } from '../src/i18n.js';
import { spots, routes, monthNotes } from '../src/data.js';
import { navigationUrl } from '../src/catalog.js';

test('语言优先级为链接、已保存偏好、浏览器语言，未知语言回退中文', () => {
  assert.equal(resolveLocale('en', 'zh-CN', 'zh-CN'), 'en');
  assert.equal(resolveLocale(null, 'en', 'zh-CN'), 'en');
  assert.equal(resolveLocale(null, null, 'en-US'), 'en');
  assert.equal(resolveLocale(null, null, 'fr-FR'), 'zh-CN');
});
test('切换语言支持静态文案、变量文案、无障碍文本和中文原文恢复', () => {
  assert.equal(translateText('我的拍摄清单', 'en'), 'My shot list');
  assert.equal(translateText('7月摄影推荐', 'en'), 'July photo picks');
  assert.equal(translateText('07 月 · 3 个值得按下快门的地方', 'en'), 'July · 3 photo spots');
  assert.equal(translateText('我的拍摄清单', 'zh-CN'), '我的拍摄清单');
});
test('中英文都能搜索机位，导航始终使用中文地点名称', () => {
  assert.ok(searchSpots(spots, {month:7, query:'lotus'}).some(s=>s.id==='quyuan'));
  assert.ok(searchSpots(spots, {month:4, query:'Longjing'}).some(s=>s.id==='longjing'));
  assert.ok(searchSpots(spots, {month:4, query:'龙井'}).some(s=>s.id==='longjing'));
  const village=spots.find(s=>s.id==='longjing');
  assert.equal(new URL(navigationUrl(village)).searchParams.get('keyword'),'杭州 龙井村');
});

test('所有机位建议、月份说明和路线都有完整英文内容', () => {
  const descriptions = spots.flatMap(spot => ['subject','window','time','light','frame','phone','tip','access'].map(key => spot[key]));
  descriptions.push(...monthNotes.flat(), ...routes.flatMap(route => [route.title,route.subtitle,route.duration,route.distance,route.months,route.note,...route.stops.map(([,label])=>label)]));
  for (const original of descriptions) {
    const translated = translateText(original, 'en');
    assert.notEqual(translated, original, original);
    assert.doesNotMatch(translated, /[\u3400-\u9fff]/, original);
  }
});
