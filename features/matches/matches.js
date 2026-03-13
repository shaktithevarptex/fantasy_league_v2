// ── Matches ───────────────────────────────────────
export function renderMatchesList(t) {
  const matches = t.matches||[];
  const el = document.getElementById('matches-content');
  if(!matches.length){ el.innerHTML='<div class="txt-dim ta-center" style="padding:60px;font-size:15px">🏏<br><br>No matches processed yet<br><span class="fs-12">Use Admin → Manage → Fetch Scores to load matches</span></div>'; return; }
  const sorted = [...matches].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  el.innerHTML = sorted.map(m=>{
    const ti = m.teamInfo||[];
    const teamImgs = ti.slice(0,2).map(team=>`
      <div style="display:flex;align-items:center;gap:7px;min-width:0">
        <img src="${team.img||''}" style="width:28px;height:28px;border-radius:50%;background:#1e293b;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'"/>
        <span style="font-weight:700;font-size:13px;color:var(--txt);white-space:nowrap">${escHtml(team.shortname||team.name)}</span>
      </div>
    `).join('<span style="color:var(--dim);font-size:12px;padding:0 4px">vs</span>');
    const hasTeamInfo = ti.length >= 2;
    return `
      <div class="card mb-12" onclick="showMatchDetail('${m.id}')" style="cursor:pointer;transition:background .15s" onmouseenter="this.style.background='var(--surfh)'" onmouseleave="this.style.background=''">
        ${hasTeamInfo ? `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            ${teamImgs}
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="min-width:0">
            <div class="fw-700 txt-main" style="font-size:13px;line-height:1.4">${escHtml(m.name)}</div>
            ${m.venue?`<div class="txt-dim" style="font-size:11px;margin-top:3px">📍 ${escHtml(m.venue)}</div>`:''}
            <div class="txt-dim" style="font-size:11px;margin-top:2px">📅 ${m.date||''}</div>
          </div>
          <span class="badge"
style="
background:${
m.status==='completed'
?'rgba(52,211,153,.15)'
:m.status==='live'
?'rgba(251,191,36,.15)'
:'rgba(56,189,248,.15)'
};
border:1px solid ${
m.status==='completed'
?'rgba(52,211,153,.35)'
:m.status==='live'
?'rgba(251,191,36,.35)'
:'rgba(56,189,248,.35)'
};
color:${
m.status==='completed'
?'#34d399'
:m.status==='live'
?'#fbbf24'
:'#38bdf8'
};
">
${m.status}
</span>

        </div>
        ${m.result?`<div style="color:var(--ok);font-size:12px;font-weight:600;margin-top:8px;padding-top:8px;border-top:1px solid var(--bdr)">🏆 ${escHtml(m.result)}</div>`:''}
      </div>
    `;
  }).join('');
}

export function showMatchDetail(matchId) {
  const t = getTournament();
  const match = (t.matches||[]).find(m=>m.id===matchId);
  if(!match) return;

  const el = document.getElementById('matches-content');
  const ti = match.teamInfo||[];

  const teamBanner = ti.length>=2 ? `
    <div style="display:flex;align-items:center;gap:16px;background:var(--accd);border:1px solid var(--bdra);border-radius:12px;padding:14px 18px;margin-bottom:16px;flex-wrap:wrap">
      ${ti.map(team=>`
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${team.img}" style="width:36px;height:36px;border-radius:50%;background:#1e293b;object-fit:cover" onerror="this.style.display='none'"/>
          <div>
            <div style="font-weight:800;color:var(--txt);font-size:15px">${team.name}</div>
            <div style="color:var(--dim);font-size:11px">${team.shortname}</div>
          </div>
        </div>
      `).join('<div style="flex:1;text-align:center;color:var(--dim);font-weight:900;font-size:18px">vs</div>')}
    </div>
  ` : '';

  let html = `
    <button class="btn btn-ghost mb-20" onclick="renderMatchesList(getTournament())">← Back</button>
    ${teamBanner}
    <div class="fw-800 txt-main" style="font-size:18px;margin-bottom:4px">${escHtml(match.name)}</div>
    ${match.venue?`<div class="txt-dim fs-12" style="margin-bottom:4px">📍 ${escHtml(match.venue)}</div>`:''}
    <div style="color:var(--ok);font-weight:600;font-size:13px;margin-bottom:20px">🏆 ${match.result||match.status||''}</div>
  `;

  // ── Sort teams by highest total match points ──
  const teamsSorted = (t.teams||[])
    .map(team => {

      const active = (team.players||[]).filter(p=>{
        const mp=(p.matchPoints||{})[matchId];
        return mp && ((mp.batting||0)+(mp.bowling||0)+(mp.fielding||0))!==0;
      });

      const total = active.reduce((sum,p)=>{
        const mp=(p.matchPoints[matchId]||{});
        return sum + (mp.batting||0)+(mp.bowling||0)+(mp.fielding||0);
      },0);

      return { team, active, total };

    })
    .filter(x => x.active.length)
    .sort((a,b)=> b.total - a.total);

  // ── Render teams ──
  teamsSorted.forEach(obj => {

    const team = obj.team;
    const active = obj.active;

    active.sort((a,b)=>{
      const ta=(a.matchPoints[matchId]||{}),
            tb=(b.matchPoints[matchId]||{});
      return ((tb.batting||0)+(tb.bowling||0)+(tb.fielding||0)) -
             ((ta.batting||0)+(ta.bowling||0)+(ta.fielding||0));
    });

    html += `
      <div class="card mb-14">
        <div class="lbl txt-acc">
          ${escHtml(team.name)} — ${obj.total} pts
        </div>
    `;

    active.forEach(p => {

      const mp=(p.matchPoints[matchId]||{});
      const tot=(mp.batting||0)+(mp.bowling||0)+(mp.fielding||0);

      html += `
        <div class="flex gap-10" style="padding:8px 0;border-bottom:1px solid var(--bdr)">
          <div class="flex-1">
            <div class="fw-600 txt-main">${escHtml(p.name)}</div>
            <div class="fs-11 txt-dim">
              🏏 Bat ${mp.batting||0} · ⚾ Bowl ${mp.bowling||0} · 🧤 Field ${mp.fielding||0}
            </div>
          </div>
          <span class="txt-acc fw-700" style="font-size:15px">${tot}</span>
        </div>
      `;

    });

    html += `</div>`;
  });

  el.innerHTML = html;
}

export function normalizeScorecard(apiData){
    // GAS confirmed: API returns data.scorecard[]
    // Each item has: inning (e.g. "India Inning 1"), batting[], bowling[], catching[]
    const src = apiData.scorecard || apiData.innings || [];
    return {
      ...apiData,
      innings: src.map(sc => ({
        inning:   sc.inning  || sc.team || '',
        batting:  sc.batting  || [],
        bowling:  sc.bowling  || [],
        catching: sc.catching || []
      }))
    };
  }