// ── Admin Home ────────────────────────────────────
export function renderAdminHome() {
  const grid = document.getElementById('admin-tournaments-grid');
  grid.innerHTML = '';
  if(!state.tournaments.length) {
    grid.innerHTML = `<div class="ta-center" style="padding:60px;grid-column:1/-1">
      <div style="font-size:52px;margin-bottom:16px">🏆</div>
      <div class="fw-800 txt-main" style="font-size:20px;margin-bottom:8px">No tournaments yet</div>
      <div class="txt-dim mb-24">Create one and upload your team Excel sheet</div>
      <button class="btn btn-primary" style="padding:14px 36px;font-size:15px" onclick="goNewTournament()">+ Create Tournament & Upload Teams</button>
    </div>`;
    return;
  }
  state.tournaments.forEach(t => {
    grid.appendChild(tournamentCard(t, () => openTournament(t.id)));
  });
}

export function goNewTournament() {
    state.wiz = { tName:'', sid:'', parsedTeams:[], suggestions:{}, choices:{} };
    goPage('new-tournament');
  }