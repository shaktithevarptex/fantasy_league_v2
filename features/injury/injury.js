// ── Injury Panel ──────────────────────────────────
export function renderSubInjury(t) {
  const el = document.getElementById('sub-injury');
  el.innerHTML = `
    <div class="card">
      <div class="lbl">🩹 Injury Replacement</div>
      <div class="txt-dim fs-13" style="margin:10px 0 20px;line-height:1.7">Mark a player injured and add a replacement. All points transfer automatically.</div>
      <div id="injury-msg" style="display:none;margin-bottom:14px"></div>
      <div class="flex flex-col gap-14">
        <div>
          <div class="lbl">Team</div>
          <select class="inp" id="inj-team" onchange="updateInjuryPlayers()">
            <option value="">— Select team —</option>
            ${(t.teams||[]).map(tm=>`<option value="${tm.id}">${escHtml(tm.name)}</option>`).join('')}
          </select>
        </div>
        <div id="inj-player-block" style="display:none">
          <div class="lbl">Injured Player</div>
          <select class="inp" id="inj-player"><option value="">— Select player —</option></select>
        </div>
        <div id="inj-rep-block" style="display:none">
          <div class="lbl">Replacement Player Name</div>
          <input class="inp" id="inj-rep" placeholder="Type replacement player's full name"/>
        </div>
        <button class="btn btn-danger" id="inj-submit-btn" style="display:none" onclick="processInjury()">⚡ Process Replacement</button>
      </div>
      ${buildCurrentInjuries(t)}
    </div>
  `;
}

export function updateInjuryPlayers() {
    const teamId = document.getElementById('inj-team')?.value;
    const t = getTournament();
    const team = (t?.teams||[]).find(x=>x.id===teamId);
    const pb = document.getElementById('inj-player-block');
    const rb = document.getElementById('inj-rep-block');
    const sb = document.getElementById('inj-submit-btn');
    if(!team){ if(pb)pb.style.display='none'; if(rb)rb.style.display='none'; if(sb)sb.style.display='none'; return; }
    const ps = document.getElementById('inj-player');
    ps.innerHTML = '<option value="">— Select player —</option>' +
      (team.players||[]).filter(p=>!p.isInjured).map(p=>`<option value="${p.id}">${escHtml(p.name)} (${p.totalPoints||0} pts)</option>`).join('');
    if(pb)pb.style.display='block';
    if(rb)rb.style.display='block';
    if(sb)sb.style.display='block';
  }

  export function buildCurrentInjuries(t) {
    const injured = (t.teams||[]).flatMap(tm=>(tm.players||[]).filter(p=>p.isInjured).map(p=>({...p,teamName:tm.name})));
    if(!injured.length) return '';
    return `<div style="margin-top:24px"><div class="lbl">Current Injuries</div><div style="margin-top:10px">${
      injured.map(p=>`<div class="flex jc-between" style="padding:8px 0;border-bottom:1px solid var(--bdr)"><div><span style="color:var(--err)">🩹 ${escHtml(p.name)}</span><span class="txt-dim fs-12" style="margin-left:8px">${escHtml(p.teamName)}</span></div><span class="badge" style="background:rgba(248,113,113,.15);border:1px solid rgba(248,113,113,.35);color:var(--err)">injured</span></div>`).join('')
    }</div></div>`;
  }

  export function processInjury() {
    const teamId = document.getElementById('inj-team')?.value;
    const playerId = document.getElementById('inj-player')?.value;
    const repName = (document.getElementById('inj-rep')?.value||'').trim();
    const msgEl = document.getElementById('injury-msg');
  
    if(!teamId||!playerId||!repName){ if(msgEl){msgEl.innerHTML='<div class="alert alert-err">Fill all fields.</div>';msgEl.style.display='block';} return; }
    const t = getTournament();
    const team = (t.teams||[]).find(x=>x.id===teamId);
    const injured = (team?.players||[]).find(p=>p.id===playerId);
    if(!injured) return;
  
    const rep = {id:makeId('rep'),name:repName,originalName:repName,totalPoints:injured.totalPoints||0,battingPoints:injured.battingPoints||0,bowlingPoints:injured.bowlingPoints||0,fieldingPoints:injured.fieldingPoints||0,matchPoints:{...(injured.matchPoints||{})},isInjured:false,replacedFor:injured.name};
    const newTeams = (t.teams||[]).map(tm=>{
      if(tm.id!==teamId) return tm;
      return {...tm, players:[...tm.players.map(p=>p.id===playerId?{...p,isInjured:true}:p), rep]};
    });
    updateTournament({...t, teams:newTeams});
    if(msgEl){msgEl.innerHTML=`<div class="alert alert-ok">✅ ${escHtml(injured.name)} → ${escHtml(repName)}. ${injured.totalPoints||0} pts transferred.</div>`;msgEl.style.display='block';}
    renderSubInjury(getTournament());
  }
  