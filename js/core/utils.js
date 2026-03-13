// ═══════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════
export function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
export function escAttr(s){ return String(s||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }
export function escId(s){ return String(s||'').replace(/[^a-zA-Z0-9]/g,'_'); }
export function makeId(prefix){ return prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); }

export const norm = s => (s||"").toLowerCase().replace(/[^a-z]/g,"");

// ── Weekly helpers ────────────────────────────────
export function getWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0,10);
}
export function getWeekSunday(date) {
  const mon = new Date(getWeekMonday(date));
  mon.setDate(mon.getDate() + 6);
  return mon.toISOString().slice(0,10);
}
export function weekKey(date) { return getWeekMonday(date); }
export function weekLabel(key) {
  if(!key) return '';
  const sun = getWeekSunday(key);
  const fmt = d => {
    const [y,m,dd] = d.split('-');
    return `${dd} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]}`;
  };
  return `${fmt(key)} – ${fmt(sun)}`;
}
export function getISOWeekNum(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const y = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-y)/86400000)+1)/7);
}
export function weekKeyFromInput(val) {
  // val = "YYYY-Www"
  if(!val) return weekKey(new Date());
  const [yr, ww] = val.split('-W');
  const year = parseInt(yr), week = parseInt(ww);
  const jan4 = new Date(year, 0, 4);
  const startW1 = new Date(jan4);
  startW1.setDate(jan4.getDate() - (jan4.getDay()||7) + 1);
  const mon = new Date(startW1);
  mon.setDate(startW1.getDate() + (week-1)*7);
  return mon.toISOString().slice(0,10);
}