import { spots, photos, sources, monthNotes, routes } from './data.js';
import { localize, resolveLocale, translateText, searchSpots } from './i18n.js';
import { selectSpots, seasonForMonth, navigationUrl, toggleSaved } from './catalog.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const paths = {
  aperture:'<circle cx="12" cy="12" r="9"/><path d="m14.3 3.3-4.6 8 4.6 8M3.2 10h9.2l4.6 8M6.5 19.1l4.6-8-4.6-8M20.8 14h-9.2L7 6"/>',
  'arrow-up-right':'<path d="M5 19 19 5M5 5h14v14"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  bookmark:'<path d="M6 4h12v17l-6-4-6 4z"/>',
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2.3"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4"/>',
  x:'<path d="m6 6 12 12M6 18 18 6"/>',
  locate:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  route:'<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h6a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',
  check:'<path d="m5 12 4 4L19 6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.pin}</svg>`;
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
const storeKey = 'hangzhou-photo-map:saved:v1';
function readSaved() {
  try { const stored = JSON.parse(localStorage.getItem(storeKey)); return Array.isArray(stored) ? [...new Set(stored)].filter(id => spots.some(s => s.id === id)) : []; }
  catch { return []; }
}
const localeKey = 'hangzhou-photo-map:locale:v1';
let storedLocale;
try { storedLocale = localStorage.getItem(localeKey); } catch {}
const initialLocale = resolveLocale(new URL(location.href).searchParams.get('lang'), storedLocale, navigator.language);
const requestedMonth = Number(new URL(location.href).searchParams.get('month'));
const nowMonth = Number(new Intl.DateTimeFormat('en-US', { month:'numeric', timeZone:'Asia/Shanghai' }).format(new Date()));
const state = { locale:initialLocale, month:requestedMonth >= 1 && requestedMonth <= 12 && Number.isInteger(requestedMonth) ? requestedMonth : nowMonth, tag:'全部', query:'', saved:readSaved(), mapScope:'month', mapSelected:null };
const monthEn = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const monthCn = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const tagNames = ['全部','花卉','湖景','山林','人文','秋色','人像','日落','夜景','冬景'];
function applyLocale() {
  localize(document.body, state.locale);
  document.documentElement.lang = state.locale;
  document.title = state.locale === 'en' ? 'Hangzhou in Frames — A year-round photo guide' : '杭州光影历 — 把四季，拍进生活里';
  $('meta[name="description"]').content = state.locale === 'en' ? 'Discover Hangzhou photo spots by month, with seasonal subjects, light, composition tips and your own shot list.' : '杭州一年四季摄影地图。按月份寻找拍摄地点、季节题材、光线与构图，收藏自己的杭州拍摄清单。';
  $('#language-select').value = state.locale;
}
let toastTimer;
function toast(message) { $('#toast').textContent = message; applyLocale(); $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500); }
function changeSaved(id) {
  if (!spots.some(s => s.id === id)) return;
  state.saved = toggleSaved(state.saved, id);
  let stored = true;
  try { localStorage.setItem(storeKey, JSON.stringify(state.saved)); } catch { stored = false; }
  renderCards(); renderSaved(); renderSaveButtons();
  if (state.mapScope === 'saved') renderMap();
  toast(stored ? (state.saved.includes(id) ? '已加入拍摄清单，下次出发就去这里。' : '已从拍摄清单移除') : '本次已收藏；浏览器未允许保存，刷新后将丢失。');
}
function renderSaveButtons() {
  $('#saved-count').textContent = state.saved.length;
  document.querySelectorAll('[data-save]').forEach(button => {
    const saved = state.saved.includes(button.dataset.save);
    button.classList.toggle('saved', saved);
    button.setAttribute('aria-pressed', String(saved));
    if (button.classList.contains('save-spot')) button.setAttribute('aria-label', `${saved ? '取消收藏' : '收藏'}${spots.find(s => s.id === button.dataset.save)?.name || ''}`);
    else button.innerHTML = `${icon(saved ? 'check' : 'bookmark')}${saved ? '已加入清单' : '加入拍摄清单'}`;
  });
  applyLocale();
}
function renderCalendar() {
  const season = seasonForMonth(state.month);
  document.querySelectorAll('[data-season]').forEach(button => { const selected = button.dataset.season === season; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected); });
  $('#months').innerHTML = monthCn.map((name, index) => `<button data-month="${index+1}" class="${state.month === index+1 ? 'selected' : ''}" aria-pressed="${state.month === index+1}" aria-label="${index+1}月摄影推荐"><span class="month-number">${String(index+1).padStart(2,'0')}</span><span class="month-name">${name}</span>${nowMonth === index+1 ? '<span class="current-dot" title="当前月份"></span>' : ''}</button>`).join('');
  $('#month-note').textContent = `${state.month} 月拍摄关键词：${monthNotes[state.month-1][1]}`;
  $('#month-en').textContent = monthEn[state.month-1];
  $('#discover-title').textContent = monthNotes[state.month-1][0];
  $('#tag-filters').innerHTML = tagNames.map(tag => `<button data-tag="${tag}" class="${state.tag === tag ? 'active' : ''}" aria-pressed="${state.tag === tag}">${tag}</button>`).join('');
  applyLocale();
}
function filteredSpots() { return searchSpots(spots, {month:state.month,tag:state.tag,query:state.query}); }
function renderCards() {
  const selected = filteredSpots();
  $('#result-count').textContent = `${String(state.month).padStart(2,'0')} 月 · ${selected.length} 个值得按下快门的地方`;
  $('#empty').hidden = !!selected.length;
  $('#spot-grid').innerHTML = selected.map((spot, index) => {
    const photo = photos[spot.photo];
    return `<article class="spot-card"><div class="card-image"><button class="card-open" data-detail="${spot.id}" aria-label="查看${spot.name}拍摄攻略"><img src="${photo.file}" alt="${escape(photo.label)}" loading="lazy" width="700" height="500" style="object-position:${escape(photo.position || 'center')}"></button><span class="card-image-tag">${spot.tags[0]} / ${String(index+1).padStart(2,'0')}</span><button class="save-spot" data-save="${spot.id}" aria-label="收藏${spot.name}" aria-pressed="false">${icon('bookmark')}</button><span class="image-caption">${escape(photo.placeLabel || spot.name)} · 地点实景</span></div><div class="card-title-line"><h3><button data-detail="${spot.id}">${spot.name}</button></h3><span class="card-area">${icon('pin')}${spot.area}</span></div><p class="card-subject">${spot.subject}</p><div class="card-bottom"><span>${icon('clock')}${spot.time}</span><button data-detail="${spot.id}">去看看怎么拍 ${icon('arrow-up-right')}</button></div></article>`;
  }).join('');
  renderSaveButtons();
}
function selectMonth(month) {
  state.month = month; state.mapSelected = null;
  const url = new URL(location.href); url.searchParams.set('month', month); history.replaceState(null,'',url);
  renderCalendar(); renderCards(); renderMap();
}
function renderMap() {
  const selected = state.mapScope === 'saved' ? selectSpots(spots, {onlySaved:true,saved:state.saved}) : searchSpots(spots, {month:state.mapScope === 'all' ? 0 : state.month, tag:state.tag, query:state.query});
  $('#map-count').textContent = selected.length;
  $('#map-list').innerHTML = selected.length ? selected.map((s,i) => `<button data-map-id="${s.id}" class="${state.mapSelected === s.id ? 'active' : ''}" aria-label="在地图上查看${s.name}"><span class="map-list-index">${String(i+1).padStart(2,'0')}</span><span><strong>${s.name}</strong><small>${s.area} · ${s.tags.join(' / ')}</small></span></button>`).join('') : '<p class="map-no-results">这里还没有机位。试试「全年机位」，或先收藏一个喜欢的地方。</p>';
  $('#map-markers').innerHTML = selected.map((s,i) => {
    const x = (s.lng-120.045)/.21*900, y = (30.329-s.lat)/.154*600;
    return `<g class="map-marker ${state.mapSelected === s.id ? 'active' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" data-map-id="${s.id}" role="button" tabindex="0" aria-label="${s.name}，查看机位"><circle r="16"/><text text-anchor="middle" dominant-baseline="central">${String(i+1).padStart(2,'0')}</text></g>`;
  }).join('');
  if (state.mapSelected && selected.some(s=>s.id===state.mapSelected)) showMapPopup(state.mapSelected);
  else { state.mapSelected = null; $('#map-popup').hidden = true; }
  applyLocale();
}
function showMapPopup(id) {
  const spot = spots.find(s=>s.id===id); if (!spot) return;
  state.mapSelected = id;
  document.querySelectorAll('[data-map-id]').forEach(el => el.classList.toggle('active',el.dataset.mapId===id));
  $('#map-popup').innerHTML = `<button class="popup-close" aria-label="关闭机位提示" data-popup-close>×</button><strong>${spot.name}</strong><p>${spot.subject}<br>${spot.time} · ${spot.lens}</p><button data-detail="${id}">查看完整拍摄攻略 ↗</button>`;
  $('#map-popup').hidden = false;
  applyLocale();
}
const detailDialog = $('#detail-dialog');
function openContent(html) {
  $('#saved-dialog').close();
  $('#detail-content').innerHTML = html;
  if (!detailDialog.open) detailDialog.showModal();
  detailDialog.scrollTop = 0;
  hydrateIcons(detailDialog);
  renderSaveButtons();
}
function cover(photoId, eyebrow, title) {
  const photo = photos[photoId];
  return `<div class="detail-cover"><img src="${photo.file}" alt="${escape(photo.label)}" style="object-position:${escape(photo.position || 'center')}"><div class="cover-title"><div class="eyebrow">${escape(eyebrow)}</div><h2>${escape(title)}</h2></div></div>`;
}
function openDetail(id) {
  const spot = spots.find(s=>s.id===id); if (!spot) return;
  const source = sources[spot.source], photo = photos[spot.photo];
  openContent(`${cover(spot.photo,spot.en,spot.name)}<div class="detail-body"><div class="detail-subject">${spot.subject}</div><div class="detail-window">${icon('calendar')}${spot.window}</div><div class="detail-stats"><div><span>建议拍摄时段</span><strong>${spot.time}</strong></div><div><span>适合的光线</span><strong>${spot.light}</strong></div><div><span>全画幅等效焦段</span><strong>${spot.lens}</strong></div></div><h3>站在哪里，怎么构图？</h3><p>${spot.frame}</p><h3>只有手机，也能拍</h3><p>${spot.phone}</p><div class="detail-box">${spot.tip}</div><h3>出发前，记得看一眼</h3><p>${spot.access}</p><p class="detail-source">季节与地点资料：<a href="${source.url}" data-i18n-skip target="_blank" rel="noopener noreferrer">${source.name}</a>（${source.date}）。月份为参考窗口，并非实时花情。时段、焦段和构图为本站编辑建议，请按现场光线调整。<br>图片：<a href="${photo.url}" data-i18n-skip target="_blank" rel="noopener noreferrer">${escape(photo.by)}${photo.provider && photo.provider !== photo.by ? ' / ' + escape(photo.provider) : ''}</a> · ${escape(photo.label)}。${photo.checkedAt ? "核对于 " + photo.checkedAt + "，为历史实景，非实时花情。" : ""}<br>${photo.imageUrl ? `<a href="${photo.imageUrl}" target="_blank" rel="noopener noreferrer">查看未裁切原图 ↗</a>` : ""}</p><div class="detail-actions"><button class="button primary" data-save="${spot.id}" aria-pressed="false">${icon('bookmark')}加入拍摄清单</button><a href="${navigationUrl(spot)}" target="_blank" rel="noopener noreferrer" class="button secondary">${icon('pin')}高德地图找路 ${icon('arrow-up-right')}</a></div></div>`);
}
function renderSaved() {
  const selected = spots.filter(s=>state.saved.includes(s.id));
  $('#saved-list').innerHTML = selected.length ? selected.map(s=>`<div class="saved-list-item"><img src="${photos[s.photo].file}" alt="${escape(photos[s.photo].label)}"><div class="saved-info"><button data-detail="${s.id}"><strong>${s.name}</strong><small>${s.area} · ${s.window}</small></button></div><button data-remove-saved="${s.id}" aria-label="移除${s.name}">${icon('x')}</button></div>`).join('') : `<div class="saved-empty">${icon('bookmark')}清单还是空的。<br>点击机位卡片上的收藏图标，收下下一次出发的灵感。</div>`;
  $('#export-list').disabled = !selected.length;
  applyLocale();
}
function renderRoutes() {
  $('#route-grid').innerHTML = routes.map(route => `<article class="route-card"><div class="route-image"><img src="${photos[route.photo].file}" alt="${escape(photos[route.photo].label)}" loading="lazy" width="700" height="400"><span class="route-no">${route.no}</span><span class="route-season">${route.months}</span></div><div class="route-content"><span class="eyebrow">${route.subtitle}</span><h3>${route.title}</h3><div class="route-footer"><span>${icon('clock')}${route.duration}</span><span>${icon('route')}${route.distance}</span><button data-route="${route.id}" aria-label="查看路线：${route.title}">${icon('arrow-up-right')}</button></div></div></article>`).join('');
  applyLocale();
}
function openRoute(id) {
  const route = routes.find(r=>r.id===id); if (!route) return;
  openContent(`${cover(route.photo,'A LITTLE WANDER, A LOT OF FRAMES',route.title)}<div class="detail-body"><p>${route.subtitle} · ${route.duration} · ${route.distance}</p><ol class="route-stops">${route.stops.map(([spotId,label])=>`<li>${label}<br><button data-detail="${spotId}">查看${spots.find(s=>s.id===spotId).name}的拍摄攻略 ↗</button></li>`).join('')}</ol><div class="detail-box">${route.note}</div><p>路线是摄影主题建议，距离与时段为规划约数。请根据当季物候、天气与体力调整。沿途入园、票务和交通以官方当日信息为准。</p><div class="detail-actions"><button class="button primary" data-save-route="${route.id}">${icon('bookmark')}收藏沿途 ${route.stops.length} 个机位</button></div></div>`);
}
const notes = {
  light: {title:'比起滤镜，先找到那束光',subtitle:'01 / 关于光线',photo:'lake',sections:[['把一天分成三种光','清晨与日落前的光线角度较低，适合侧光和逆光。阴天如同一块大柔光板，适合花卉、园林和人像。正午强光可以尝试拍建筑的几何影子，或转入有遮阴的步道。'],['先看高光，再按快门','逆光拍花时，先对花瓣最亮的部分测光，适度降低曝光。手机可以点按主体，再拖动旁边的小太阳；不要为了提亮阴影把天空变成一片白。'],['蓝调只有一小段','想拍城市夜景，可以在日落前到场。日落后天空由蓝渐黑，亮灯建筑和天空更容易平衡。这里的时段是经验建议，实际以当天日落与天气为准。']]},
  frame: {title:'给风景，一点呼吸的空间',subtitle:'02 / 关于构图',photo:'garden',sections:[['先问：这一张的主角是什么？','拍西湖，是一艘船、一座塔，还是远山的层次？按快门前先选一个主角，再移动脚步，排除与它争抢注意力的树枝、路牌和杂乱色块。'],['留白不是没有内容','湖水和薄雾都可以成为留白。把主体放在三分线附近，给船行驶的方向、人物看向的方向多留一点空间。没有必要每张都把主体放正中。'],['让画面有近有远','近处枝叶、中间游船、远处山塔，可以形成三层空间。前景只需一点点，太多反而遮住主题。拍完远景，再补一张细节，组图就有了节奏。']]},
  phone: {title:'你的下一张好照片，就在口袋里',subtitle:'03 / 关于手机摄影',photo:'green',sections:[['用熟 1×，再尝试 2×','1× 适合湖岸、街巷和完整环境；2× 适合提炼树叶、花窗和人物。不同手机的 2× 可能是裁切，弱光时先使用主摄，不必一味放大。'],['网格线是你的水平仪','在相机设置中打开网格线，保持湖面水平、建筑竖直。拍园林时先让手机保持垂直，再调整自己的站位与高度。'],['夜景先稳，再拍','把手机靠在安全稳定的位置，拍摄时停住几秒；画面里有人走动时，夜景模式可能造成拖影。使用普通模式提高快门，或者等待画面静下来。']]}
};
function openNote(id) {
  const note=notes[id]; if(!note) return;
  openContent(`${cover(note.photo,'NOTES FROM BEHIND THE LENS',note.subtitle)}<div class="detail-body"><h2 class="detail-subject">${note.title}</h2>${note.sections.map(([title,body])=>`<h3>${title}</h3><p>${body}</p>`).join('')}<p class="detail-source">本站原创摄影建议，效果随设备、天气和现场条件变化。配图为氛围参考。</p></div>`);
}
function openSources() {
  openContent(`<div class="detail-body" style="padding-top:45px"><div class="eyebrow">RESEARCH & IMAGE CREDITS</div><h2 class="detail-subject" style="margin-top:12px">让每一次出发，都有据可循。</h2><p>资料整理于 2026 年 10 月 15 日。季节窗口综合公开资料与一般物候整理，非实时花情预测；摄影构图、时段与器材建议为本站编辑内容。场所票务、预约和交通请查询最新官方公告。</p><h3>地点与季节资料</h3><ul class="source-list">${Object.values(sources).map(s=>`<li><a href="${s.url}" data-i18n-skip target="_blank" rel="noopener noreferrer">${s.name} ↗</a><br><small>${s.date}</small></li>`).join('')}</ul><h3>摄影作品</h3><p>机位卡片、详情和路线均使用对应地点实景，来源图文、原图地址和核对日期逐项保留。照片为历史记录，不代表当日花情。首页与摄影手记的配图另行注明来源。图片版权归原作者及来源网站，保留原站署名与水印。</p><ul class="source-list">${Object.values(photos).map(p=>`<li><a href="${p.url}" data-i18n-skip target="_blank" rel="noopener noreferrer">${escape(p.by)}${p.provider && p.provider !== p.by ? ' / ' + escape(p.provider) : ''} ↗</a><br><small>${escape(p.label)}${p.checkedAt ? " · 核对于 " + p.checkedAt : ""}</small>${p.placeId ? `<br><a href="${p.imageUrl}" target="_blank" rel="noopener noreferrer">查看原图 ↗</a>` : ""}</li>`).join('')}</ul><h3>地图说明</h3><p>地图为本站绘制的摄影机位分布示意，坐标为景区级近似位置，地形与路网作艺术化简化，不提供路线计算，不可用于实际导航。点击机位详情中的「高德地图找路」可搜索实际目的地。</p></div>`);
}
function exportList() {
  const selected = spots.filter(s=>state.saved.includes(s.id)); if(!selected.length) return;
  const t = value => translateText(value, state.locale);
  const content = [t('杭州光影历 · 我的拍摄清单'),t('季节窗口仅作参考，请查最新花情与开放公告。'),...selected.map((s,i)=>`\n${i+1}. ${t(s.name)} / ${t(s.area)}\n${t(s.window)}\n${t('建议时段：')}${t(s.time)}\n${t('怎么拍：')}${t(s.frame)}\n${t('手机拍法：')}${t(s.phone)}\n${t('出行提醒：')}${t(s.access)}\n${t('导航：')}${navigationUrl(s)}\n${t('资料：')}${sources[s.source].url}`)].join('\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF',content],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a'); link.href=url; link.download=state.locale === 'en' ? 'hangzhou-shot-list.txt' : '杭州光影历-我的拍摄清单.txt'; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast('拍摄清单已导出，带着灵感出发吧。');
}

document.addEventListener('click',event=>{
  const target=event.target.closest('button, a, [data-map-id]'); if(!target) return;
  if(target.hasAttribute('data-save')) { changeSaved(target.dataset.save); return; }
  if(target.hasAttribute('data-remove-saved')) { changeSaved(target.dataset.removeSaved); return; }
  if(target.hasAttribute('data-detail')) { openDetail(target.dataset.detail); return; }
  if(target.hasAttribute('data-month')) { selectMonth(Number(target.dataset.month)); return; }
  if(target.hasAttribute('data-season')) { selectMonth({spring:4,summer:7,autumn:10,winter:1}[target.dataset.season]); return; }
  if(target.hasAttribute('data-tag')) { state.tag=target.dataset.tag; renderCalendar(); renderCards(); renderMap(); return; }
  if(target.hasAttribute('data-map-id')) { showMapPopup(target.dataset.mapId); return; }
  if(target.hasAttribute('data-popup-close')) { state.mapSelected=null; $('#map-popup').hidden=true; document.querySelectorAll('[data-map-id]').forEach(el=>el.classList.remove('active')); return; }
  if(target.hasAttribute('data-close')) { target.closest('dialog').close(); return; }
  if(target.hasAttribute('data-route')) { openRoute(target.dataset.route); return; }
  if(target.hasAttribute('data-note')) { openNote(target.dataset.note); return; }
  if(target.hasAttribute('data-save-route')) {
    const route=routes.find(r=>r.id===target.dataset.saveRoute);
    state.saved=[...new Set([...state.saved,...route.stops.map(([id])=>id)])];
    let stored=true; try{localStorage.setItem(storeKey,JSON.stringify(state.saved));}catch{stored=false;}
    renderCards();renderSaved();renderSaveButtons();if(state.mapScope==='saved')renderMap();
    toast(stored?'沿途机位已加入拍摄清单':'本次已收藏；浏览器未允许保存，刷新后将丢失。');
  }
});
$('#language-select').addEventListener('change', event => {
  state.locale = resolveLocale(event.target.value);
  try { localStorage.setItem(localeKey, state.locale); } catch {}
  const url = new URL(location.href); url.searchParams.set('lang', state.locale);
  history.replaceState(null, '', url);
  applyLocale();
});
$('#search').addEventListener('input',event=>{state.query=event.target.value;renderCards();renderMap();});
$('#reset-filters').addEventListener('click',()=>{state.tag='全部';state.query='';$('#search').value='';renderCalendar();renderCards();renderMap();});
$('#map-scope').addEventListener('change',event=>{state.mapScope=event.target.value;state.mapSelected=null;renderMap();});
$('#open-saved').addEventListener('click',()=>{$('#detail-dialog').close();renderSaved();$('#saved-dialog').showModal();});
$('#export-list').addEventListener('click',exportList);
$('#show-sources').addEventListener('click',openSources);
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$('#search').focus();$('#search').scrollIntoView({block:'center'});}
  const marker=event.target.closest('.map-marker');if(marker&&['Enter',' '].includes(event.key)){event.preventDefault();showMapPopup(marker.dataset.mapId);}
});
// The map is a self-contained, approximate scenic diagram. Navigation uses a place-name search.
const map=$('#photo-map'),world=$('#map-world');
let scale=1,panX=0,panY=0,drag=null;
function updateMapTransform(){world.setAttribute('transform',`translate(${panX} ${panY}) scale(${scale})`);$('#zoom-in').disabled=scale>=2.6;$('#zoom-out').disabled=scale<=1;}
function zoom(delta){const previous=scale;scale=Math.min(2.6,Math.max(1,Math.round((scale+delta)*10)/10));panX=450-(450-panX)*scale/previous;panY=300-(300-panY)*scale/previous;if(scale===1){panX=0;panY=0;}updateMapTransform();}
$('#zoom-in').addEventListener('click',()=>zoom(.4));$('#zoom-out').addEventListener('click',()=>zoom(-.4));$('#zoom-reset').addEventListener('click',()=>{scale=1;panX=0;panY=0;updateMapTransform();});
map.addEventListener('pointerdown',event=>{if(event.target.closest('.map-marker')||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,px:panX,py:panY};map.setPointerCapture(event.pointerId);});
map.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const rect=map.getBoundingClientRect();panX=Math.min(600,Math.max(-1500,drag.px+(event.clientX-drag.x)*900/rect.width));panY=Math.min(400,Math.max(-1000,drag.py+(event.clientY-drag.y)*600/rect.height));updateMapTransform();});
function endDrag(){drag=null;}map.addEventListener('pointerup',endDrag);map.addEventListener('pointercancel',endDrag);

renderCalendar();renderCards();renderMap();renderRoutes();renderSaved();hydrateIcons();updateMapTransform();applyLocale();
