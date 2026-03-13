
export function onCapWeekChange() {
  const val = document.getElementById('cap-week-input')?.value;
  const key = weekKeyFromInput(val);
  const lbl = document.getElementById('cap-week-label');
  if(lbl) lbl.textContent = weekLabel(key);
  updateCaptainPlayers(); // pre-fill if already saved
}

export function updateCaptainPlayers() {
  const teamId  = document.getElementById('cap-team')?.value;
  const wkVal   = document.getElementById('cap-week-input')?.value;
  const capSel  = document.getElementById('cap-player');
  const vcSel   = document.getElementById('vc-player');
  if(!capSel || !vcSel) return;
  const t = getTournament();
  const team = (t.teams||[]).find(x=>x.id===teamId);
  if(!team) {
    capSel.innerHTML = '<option value="">— pick team first —</option>';
    vcSel.innerHTML  = '<option value="">— pick team first —</option>';
    return;
  }
  const wkKey   = weekKeyFromInput(wkVal);
  const existing = ((t.weeklyCaptains||{})[wkKey]||{})[teamId] || {};
  const opts = p => team.players.map(pl =>
    `<option value="${pl.id}" ${pl.id===p?'selected':''}>${escHtml(pl.name)}</option>`
  ).join('');
  capSel.innerHTML = opts(existing.captain);
  vcSel.innerHTML  = opts(existing.vc);
}

export function saveCaptain() {
  const teamId  = document.getElementById('cap-team')?.value;
  const capId   = document.getElementById('cap-player')?.value;
  const vcId    = document.getElementById('vc-player')?.value;
  const wkVal   = document.getElementById('cap-week-input')?.value;
  if(!teamId || !capId || !vcId) { alert('Select team, captain and vice-captain'); return; }
  if(capId === vcId) { alert('Captain and Vice-Captain must be different players'); return; }
  const wkKey  = weekKeyFromInput(wkVal);
  const t      = getTournament();
  const team   = (t.teams||[]).find(x=>x.id===teamId);
  const cap    = (team?.players||[]).find(p=>p.id===capId);
  const vc     = (team?.players||[]).find(p=>p.id===vcId);
  const updated = { ...t,
    weeklyCaptains: { ...(t.weeklyCaptains||{}),
      [wkKey]: { ...((t.weeklyCaptains||{})[wkKey]||{}), [teamId]: { captain:capId, vc:vcId } }
    }
  };
  updateTournament(updated);
  renderSubCaptain(getTournament());
  renderLeaderboard(getTournament());
  // Toast
  const toast = document.createElement('div');
  toast.style.cssText='position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.4)';
  toast.textContent = `✅ ${cap?.name||'Captain'} (C) · ${vc?.name||'VC'} — Week ${weekLabel(wkKey)}`;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(), 3200);
}

export function deleteCaptainEntry(wkKey, teamId) {
  if(!confirm('Remove this captain selection?')) return;
  const t = getTournament();
  const newWc = JSON.parse(JSON.stringify(t.weeklyCaptains||{}));
  if(newWc[wkKey]) {
    delete newWc[wkKey][teamId];
    if(!Object.keys(newWc[wkKey]).length) delete newWc[wkKey];
  }
  updateTournament({...t, weeklyCaptains:newWc});
  renderSubCaptain(getTournament());
  renderLeaderboard(getTournament());
}
