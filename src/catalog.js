export function seasonForMonth(month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError('月份须为 1–12');
  return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
}
export function selectSpots(spots, { month = 0, tag = '全部', query = '', onlySaved = false, saved = [] } = {}) {
  const term = query.trim().toLocaleLowerCase();
  return spots.filter(s => (!month || s.months.includes(Number(month)))
    && (tag === '全部' || s.tags.includes(tag))
    && (!term || [s.name, s.area, s.subject, ...s.tags].join(' ').toLocaleLowerCase().includes(term))
    && (!onlySaved || saved.includes(s.id)));
}
export function navigationUrl(spot) {
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(`杭州 ${spot.navName || spot.name}`)}&city=杭州&callnative=0`;
}
export function toggleSaved(saved, id) {
  return saved.includes(id) ? saved.filter(item => item !== id) : [...new Set([...saved, id])];
}
