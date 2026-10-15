import { english } from './en-ui.js';
import { spotContent, routeContent, monthsContent } from './en-content.js';
import { spots, routes, monthNotes } from './data.js';
import { selectSpots } from './catalog.js';

const dictionary = { ...english };
const fields = ['subject','window','frame','phone','tip','access'];
for (const spot of spots) fields.forEach((field,index) => { dictionary[spot[field]] = spotContent[spot.id][index]; });
for (const route of routes) {
  const translation = routeContent[route.id];
  ['title','subtitle','duration','distance','months'].forEach((field,index) => { dictionary[route[field]] = translation[index]; });
  route.stops.forEach(([,label], index) => { dictionary[label] = translation[5][index]; });
  dictionary[route.note] = translation[6];
}
monthNotes.forEach((pair,index) => pair.forEach((value,column) => { dictionary[value] = monthsContent[index][column]; }));
Object.assign(dictionary, {
  '收藏':'Save ', '取消收藏':'Unsave ', '移除':'Remove ', '查看':'View ', '拍摄攻略':' photo guide', '，查看机位':' — view spot',
  '实景':'on location', '核对于 ':'Verified ', ' · 核对于 ':' · Verified ', '，为历史实景，非实时花情。':'; historical photograph, not a live bloom report.',
  '村口桂树实景照片':'Village osmanthus, on location','。':'. ', '全年':'Year-round', '资料页':'Reference page'
});
// Exact source phrases are the catalog keys. Longer phrases win for composed labels.
const phrasePattern = new RegExp(Object.keys(dictionary).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
export const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function normalize(value) {
  if (typeof value !== 'string') return null;
  if (/^en(?:-|$)/i.test(value)) return 'en';
  if (/^zh(?:-|$)/i.test(value)) return 'zh-CN';
  return null;
}
export function resolveLocale(query, stored, browser) {
  return normalize(query) || normalize(stored) || normalize(browser) || 'zh-CN';
}
export function translateText(value, locale) {
  if (locale !== 'en' || typeof value !== 'string') return value;
  const text=value.trim();
  let translated=dictionary[text];
  if (translated === undefined) {
    let match;
    if ((match=text.match(/^(\d{1,2})月摄影推荐$/))) translated=`${monthNames[Number(match[1])-1]} photo picks`;
    else if ((match=text.match(/^(\d{1,2}) 月 · (\d+) 个值得按下快门的地方$/))) translated=`${monthNames[Number(match[1])-1]} · ${match[2]} photo spots`;
    else if ((match=text.match(/^(\d{1,2}) 月拍摄关键词：(.*)$/))) translated=`${monthNames[Number(match[1])-1]} subjects: ${translateText(match[2],locale)}`;
    else if ((match=text.match(/^收藏沿途 (\d+) 个机位$/))) translated=`Save all ${match[1]} stops`;
    else if ((match=text.match(/^(?:查看路线：)(.*)$/))) translated=`View route: ${translateText(match[1],locale)}`;
    else translated=text.replace(phrasePattern,key=>dictionary[key]);
  }
  return value.slice(0,value.length-value.trimStart().length)+translated+value.slice(value.trimEnd().length);
}
export function searchSpots(items, options = {}) {
  const { query='', ...filters }=options;
  const filtered=selectSpots(items,filters), term=query.trim().toLocaleLowerCase();
  if(!term) return filtered;
  return filtered.filter(spot => [spot.name,spot.en,spot.area,spot.subject,...spot.tags,translateText(spot.name,'en'),translateText(spot.area,'en'),translateText(spot.subject,'en'),...spot.tags.map(tag=>translateText(tag,'en'))].join(' ').toLocaleLowerCase().includes(term));
}

const originalText = new WeakMap(), originalAttributes = new WeakMap();
// Explicit rendering calls apply this adapter; no DOM observer or translated data mutations.
// Remember source text so switching back restores Chinese without rebuilding user state.
export function localize(root, locale) {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())) {
    if(node.parentElement?.closest('script,style,[data-i18n-skip]')) continue;
    let record=originalText.get(node);
    if(!record || record.last!==node.nodeValue) record={source:node.nodeValue};
    node.nodeValue=translateText(record.source,locale); record.last=node.nodeValue; originalText.set(node,record);
  }
  for(const element of root.querySelectorAll('[aria-label],[placeholder],[alt],[title]')) {
    if(element.closest('[data-i18n-skip]')) continue;
    const records=originalAttributes.get(element)||{};
    for(const attribute of ['aria-label','placeholder','alt','title']) {
      if(!element.hasAttribute(attribute)) continue;
      const current=element.getAttribute(attribute);
      if(!records[attribute] || records[attribute].last!==current) records[attribute]={source:current};
      const translated=translateText(records[attribute].source,locale);
      element.setAttribute(attribute,translated);records[attribute].last=translated;
    }
    originalAttributes.set(element,records);
  }
}
