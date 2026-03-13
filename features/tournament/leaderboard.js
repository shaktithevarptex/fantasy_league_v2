import { weekKey } from '../../js/core/utils.js'
import { norm, escHtml } from '../../js/core/utils.js'

// ── Leaderboard ───────────────────────────────────
export function renderLeaderboard(t) {
  const teams = t.teams||[];
  // ── Weekly-scoped captain multiplier ─────────────────────────
  // Captain/VC bonus applies ONLY to match points earned in that Mon-Sun week.
  // Each match has a date; we look up which week it falls in, then check
  // whether the player was C/VC for that week and apply 2× or 1.5× per match.
  function playerTotalWithCap(player) {
    const wc = t.weeklyCaptains || {};
    const matches = t.matches || [];
    // Map matchId → weekKey (Monday date)
    const matchWeek = {};
    matches.forEach(m => { if(m.date) matchWeek[m.id] = weekKey(new Date(m.date)); });
    // Map weekKey → boost for this player
    const boostForWeek = {};
    Object.entries(wc).forEach(([wk, teamSels]) => {
      Object.values(teamSels).forEach(sel => {
        if(player.id === sel.captain) boostForWeek[wk] = Math.max(boostForWeek[wk]||1, 2);
        else if(player.id === sel.vc) boostForWeek[wk] = Math.max(boostForWeek[wk]||1, 1.5);
      });
    });
    const mp = player.matchPoints || {};
    let total = 0;
    Object.entries(mp).forEach(([matchId, pts]) => {
      const raw = (pts.batting||0) + (pts.bowling||0) + (pts.fielding||0);
      const wk  = matchWeek[matchId];
      total += raw * (boostForWeek[wk] || 1);
    });
    // Fallback for players with totalPoints but no matchPoints breakdown
    if(!Object.keys(mp).length) total = player.totalPoints || 0;
    return Math.round(total * 10) / 10;
  }

  // Captain badge: latest week where player is C or VC
   function captainBadge(playerId) {
    const wc = t.weeklyCaptains || {};
    const sortedWks = Object.keys(wc).sort().reverse();
    for(const wk of sortedWks) {
      for(const sel of Object.values(wc[wk]||{})) {
        if(playerId === sel.captain) return 'C';
        if(playerId === sel.vc)      return 'VC';
      }
    }
    return null;
  }

  const ranked = [...teams]
    .map(tm => ({
      ...tm,
      total: (tm.players||[]).reduce((s,p) => s + playerTotalWithCap(p), 0)
    }))
    .sort((a,b) => b.total - a.total);

  const allP = teams.flatMap(tm =>
    (tm.players||[]).map(p => ({
      ...p,
      teamName:   tm.name,
      ownerName:  tm.owner || tm.name,
      cricketTeam: p.cricketTeam || p.country || '',
      capBadge:   captainBadge(p.id),
      totalWithCap: playerTotalWithCap(p)
    }))
  ).sort((a,b) => b.totalWithCap - a.totalWithCap);

  // Top performers
  const medals = ['🥇','🥈','🥉'];
  const tpBlock = document.getElementById('top-performers');
  const tpList  = document.getElementById('top-performers-list');
  if(allP.length) {
    tpBlock.style.display = 'block';
    tpList.innerHTML = allP.map((p,i) => {
      const medalColor = ['var(--gold)','var(--silver)','var(--bronze)'][i] || 'var(--dim)';
      const pts        = p.totalWithCap || p.totalPoints || 0;
      // C/VC badge pill
      const badge = p.capBadge ? `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;margin-right:6px;${p.capBadge==='C'?'background:rgba(251,191,36,.2);color:#fbbf24;border:1px solid rgba(251,191,36,.4)':'background:rgba(139,92,246,.2);color:#a78bfa;border:1px solid rgba(139,92,246,.35)'}">${p.capBadge}</span>` : '';
      // National team line
      const natLine = p.cricketTeam
        ? `<div style="font-size:12px;color:var(--dim);margin-top:3px">🏏 ${escHtml(p.cricketTeam)}</div>` : '';
      // Fantasy owner (always show, no duplication)
      const ownerLine = `<div style="font-size:12px;color:var(--acc);margin-top:2px">👤 ${escHtml(p.ownerName||p.teamName)}</div>`;
      return `
        <div class="flex items-center gap-12" style="padding:11px 0;border-bottom:1px solid var(--bdr)">
          <span style="font-size:20px;min-width:28px;text-align:center;font-weight:900;color:${medalColor}">
            ${medals[i]||i+1}
          </span>
          <div class="flex-1" style="min-width:0">
            <div class="fw-700 txt-main" style="font-size:14px;display:flex;align-items:center;flex-wrap:wrap">
              ${badge}${escHtml(p.name)}
            </div>
            ${natLine}
            ${ownerLine}
          </div>
          <div class="ta-right" style="flex-shrink:0">
            <div class="txt-acc fw-800" style="font-size:18px">${pts}</div>
            <div class="fs-10 txt-dim">pts</div>
          </div>
        </div>`;
    }).join('');
  } else {
    tpBlock.style.display = 'none';
  }

  // Standings
  const standList = document.getElementById('standings-list');
  if(!ranked.length){ standList.innerHTML='<div class="txt-dim ta-center" style="padding:30px">No teams yet</div>'; return; }
  standList.innerHTML = '';
  const leaderPoints = ranked[0]?.total || 0;

  ranked.forEach((team,i) => {
    const isLeader  = i === 0;
    const diff      = leaderPoints - (team.total||0);
    const rankColor = isLeader ? '#10b981' : '#f87171';
    const statusLbl = isLeader
      ? '🟢 Leader'
      : `🔴 ${diff % 1 === 0 ? diff : diff.toFixed(1)} pts behind`;
    const ownerTag  = team.owner && norm(team.owner)!==norm(team.name)
      ? `<span style="color:var(--acc)">👤 ${escHtml(team.owner)}</span>` : '';
    const displayTotal = (team.total||0) % 1 === 0 ? (team.total||0) : (team.total||0).toFixed(1);

    const row = document.createElement('div');
    row.className = 'team-row';
    row.innerHTML = `
      <span style="width:32px;text-align:center;font-size:18px;font-weight:900;color:${['var(--gold)','var(--silver)','var(--bronze)'][i]||'var(--dim)'}">
        ${['🥇','🥈','🥉'][i]||i+1}
      </span>
      <div class="flex-1">
        <div class="fw-800 txt-main" style="font-size:16px">${escHtml(team.name)}</div>
        <div style="margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:700;color:${rankColor}">${statusLbl}</span>
          ${ownerTag ? `<span class="fs-11">${ownerTag}</span>` : ''}
        </div>
      </div>
      <div class="ta-right" style="margin-right:10px">
        <div style="font-size:22px;font-weight:800;color:${rankColor}">${displayTotal}</div>
        <div class="fs-10 txt-dim">TOTAL PTS</div>
      </div>
      <span class="txt-dim fs-13" id="arrow-${i}">▼</span>
    `;

    // ── Expanded: group players by national cricket team ──
    const detail = document.createElement('div');
    detail.style.cssText = 'display:none;padding:0 0 14px 46px';

    const groupMap = {};
    (team.players||[]).forEach(p => {
      const nat = p.cricketTeam || p.country || '—';
      if(!groupMap[nat]) groupMap[nat] = [];
      groupMap[nat].push(p);
    });
    const groupKeys = Object.keys(groupMap).sort((a,b) => {
      if(a==='—') return 1; if(b==='—') return -1;
      return a.localeCompare(b);
    });
    groupKeys.forEach(g => groupMap[g].sort((a,b) => playerTotalWithCap(b)-playerTotalWithCap(a)));

    detail.innerHTML = groupKeys.map(nat => {
      const natLabel = nat === '—' ? 'Other / Unknown' : nat;
      const playerRows = groupMap[nat].map(p => {
        const badge = captainBadge(p.id);
        const badgePill = badge
          ? `<span style="font-size:9px;font-weight:800;padding:1px 5px;border-radius:5px;margin-right:5px;${badge==='C'?'background:rgba(251,191,36,.2);color:#fbbf24':'background:rgba(139,92,246,.2);color:#a78bfa'}">${badge}</span>`
          : '';
        const pPts = playerTotalWithCap(p);
        return `
          <div class="player-row" style="${p.isInjured?'opacity:.5':''}">
            ${p.isInjured ? '<span style="font-size:13px">🩹</span>' : ''}
            <div class="flex-1">
              <div class="${p.isInjured?'txt-dim':'txt-main'} fw-600" style="font-size:14px;${p.isInjured?'text-decoration:line-through':''}">
                ${badgePill}${escHtml(p.name)}${p.price?`<span style="font-size:10px;color:var(--warn);margin-left:6px;font-weight:400">${p.price}Cr</span>`:''}
              </div>
              <div class="fs-11 txt-dim">🏏 ${p.battingPoints||0} · ⚾ ${p.bowlingPoints||0} · 🧤 ${p.fieldingPoints||0}</div>
            </div>
            <span style="color:#7dd3fc;font-weight:700;font-size:15px">${pPts}</span>
          </div>`;
      }).join('');
      return `
        <div style="margin-top:10px">
          <div style="font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--acc);padding:4px 0 5px;border-bottom:1px solid var(--bdr);margin-bottom:4px">
            🏏 ${escHtml(natLabel)}
          </div>
          ${playerRows}
        </div>`;
    }).join('');

    let open = false;
    row.onclick = () => {
      open = !open;
      detail.style.display = open ? 'block' : 'none';
      const arr = document.getElementById('arrow-'+i);
      if(arr) arr.textContent = open ? '▲' : '▼';
    };
    standList.appendChild(row);
    standList.appendChild(detail);
  });
}