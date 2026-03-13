

// ── User Home ─────────────────────────────────────
export function renderUserHome() {
  const grid = document.getElementById('user-tournaments-grid');
  grid.innerHTML = '';
  if(!state.tournaments.length) {
    grid.innerHTML = '<div class="ta-center txt-dim" style="padding:80px"><div style="font-size:48px;margin-bottom:16px">🏆</div>No tournaments yet. Check back soon!</div>';
    return;
  }
  state.tournaments.forEach(t => {
    grid.appendChild(tournamentCard(t, () => openTournament(t.id)));
  });
}

export function tournamentCard(t, onClick) {
  const totalPlayers = (t.teams||[]).reduce((s,x)=>s+(x.players?.length||0),0);
  const el = document.createElement('div');
  el.className = 'card';
  el.style.cssText = 'border:1px solid var(--bdra);cursor:pointer;transition:background .18s';
  el.onmouseenter = () => el.style.background = 'var(--surfh)';
  el.onmouseleave = () => el.style.background = '';
  el.onclick = onClick;
  el.innerHTML = `
<div style="display:flex;justify-content:space-between;margin-bottom:12px">
  <span class="badge" style="background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.35);color:var(--ok)">
    ${escHtml(t.status||'active')}
  </span>
  <span class="txt-dim fs-11">${(t.teams||[]).length} teams</span>
</div>

<div class="fw-800 txt-main fs-17 mb-8">${escHtml(t.name)}</div>

<div class="txt-dim fs-12">
${(t.matches||[]).length} matches · ${totalPlayers} players
</div>

${state.user==='admin' ? `
<button class="btn btn-danger mt-10"
onclick="event.stopPropagation();deleteTournament('${t.id}')">
Delete
</button>
` : ''}
`;
  return el;
}

export function openTournament(tId) {
  state.tId = tId;
  currentTab = 'leaderboard';
  goPage('tournament');
}