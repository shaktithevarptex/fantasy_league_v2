// saveCaptain moved into renderSubCaptain block
export function renderManage(t){
  renderSubUpload(t);
  renderSubScores(t);
  renderSubInjury(t);
  renderSubCaptain(t); // add
  }

  export function switchSubTab(sub) {
    currentSubTab = sub;
  
    const t = getTournament();   // get tournament data
  
    ['upload','scores','captain','injury','manual'].forEach(k => {
      const el = document.getElementById('sub-'+k);
      const btn = document.getElementById('sub-btn-'+k);
  
      if(el) el.style.display = k===sub ? 'block' : 'none';
      if(btn) btn.classList.toggle('active', k===sub);
    });
  
    // render tab content
    if(sub === 'manual') renderSubManual(t);
  }

  export function renderSubUpload(t) {
    const el = document.getElementById('sub-upload');
    const existing = (t.teams||[]).map(x=>`
      <span style="background:var(--accd);border:1px solid var(--bdra);border-radius:8px;padding:6px 12px;font-size:13px;color:var(--txt);margin:3px;display:inline-block">
        ${escHtml(x.name)} <span class="txt-dim">(${x.players?.length||0})</span>
      </span>
    `).join('');
  
    el.innerHTML = `
      <div class="dropzone" id="upload-dropzone" onclick="document.getElementById('upload-file').click()"
        ondragover="event.preventDefault();this.classList.add('drag')"
        ondragleave="this.classList.remove('drag')"
        ondrop="event.preventDefault();this.classList.remove('drag');handleUploadDrop(event)">
        <div style="font-size:44px;margin-bottom:12px">📤</div>
        <div class="fw-800 txt-main" style="font-size:18px;margin-bottom:8px">Upload Teams Excel</div>
        <div class="txt-dim fs-13" style="line-height:1.8">
          Drag & drop <strong class="txt-acc">.xlsx</strong> or <span class="txt-acc" style="text-decoration:underline">click to browse</span><br>
          <span class="fs-12">Each sheet tab = one team · Each row = one player</span>
        </div>
        <input type="file" id="upload-file" accept=".xlsx,.xls,.csv" onchange="handleUploadFile(this)"/>
      </div>
      <div id="upload-msg" style="display:none;margin-top:14px"></div>
      ${(t.teams||[]).length?`<div class="card mt-20"><div class="lbl">Existing Teams (${t.teams.length})</div><div style="margin-top:10px">${existing}</div></div>`:''}
    `;
  }

  // ── Fetch Scores ──────────────────────────────────
export function renderSubScores(t) {
  const el = document.getElementById('sub-scores');
  const hitsLeft = 100 - getHits();
  const alreadyScored = new Set(
    (t.teams||[]).flatMap(tm=>(tm.players||[]).flatMap(p=>Object.keys(p.matchPoints||{})))
  );
  el.innerHTML = `
    <div class="card">
      <div class="lbl">🏏 Sync Match Scores</div>
      <div style="background:var(--accd);border:1px solid var(--bdra);border-radius:10px;padding:12px 16px;margin:12px 0 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <span class="fs-12 txt-dim"><b style="color:var(--acc)">1 hit</b> series info + <b style="color:var(--acc)">1 hit</b> per new scorecard · max 10 per sync</span>
          <span class="badge" style="background:${hitsLeft<20?'rgba(248,113,113,.2)':'rgba(52,211,153,.15)'};border:1px solid ${hitsLeft<20?'rgba(248,113,113,.4)':'rgba(52,211,153,.35)'};color:${hitsLeft<20?'var(--err)':'var(--ok)'}">
            ${hitsLeft}/100 hits left today
          </span>
        </div>
        <div class="txt-dim fs-11" style="margin-top:5px">Matches already scored: ${alreadyScored.size}</div>
      </div>

      <div class="lbl">Series ID</div>
      <div style="display:flex;gap:8px;margin-top:6px;margin-bottom:16px">
        <input id="scores-sid" class="inp flex-1" placeholder="Paste CricAPI Series ID" value="${escHtml(t.seriesId||'')}"/>
        <button class="btn btn-primary" onclick="fetchScores()" style="white-space:nowrap">⚡ Sync</button>
      </div>

      <div class="txt-dim fs-12 mb-8">Quick series:</div>
      ${[
        ['0cdf6736-ad9b-4e95-a647-5ee3a99c5510','ICC T20 WC 2026'],
        ['d5a498c8-7596-4b93-8ab0-e0efc3345312','IPL 2025'],
        ['b31173af-1e08-4359-8a7e-1521b9847e54','NZ Tour India 2026']
      ].map(([id,name])=>`
        <button class="w100 ta-left" style="background:none;border:1px solid var(--bdr);border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px;margin-bottom:6px;transition:border-color .15s;color:var(--txt)"
          onmouseover="this.style.borderColor='var(--bdra)'"
          onmouseout="this.style.borderColor='var(--bdr)'"
          onclick="document.getElementById('scores-sid').value='${id}'">
          <b>${name}</b> <span class="txt-dim fs-11" style="font-family:monospace">${id.slice(0,10)}…</span>
        </button>`).join('')}
      <div id="scores-log" class="log-box" style="display:none;margin-top:14px"></div>
    </div>
  `;
}

export function renderSubCaptain(t) {
    const el = document.getElementById("sub-captain");
  
    const wc = t.weeklyCaptains || {};
    const weeks = Object.keys(wc).sort().reverse();
  
    const todayKey = weekKey(new Date());
    const todayWeekNum = String(getISOWeekNum(new Date())).padStart(2, "0");
    const todayYear = new Date().getFullYear();
  
    const historyRows = weeks
      .flatMap((wk) =>
        Object.entries(wc[wk] || {}).map(([teamId, sel]) => {
          const team = (t.teams || []).find((x) => x.id === teamId);
          const cap = (team?.players || []).find((p) => p.id === sel.captain);
          const vc = (team?.players || []).find((p) => p.id === sel.vc);
          if (!cap) return "";
  
          return `
          <div class="cap-history-row">
  
            <div class="cap-history-info">
              <div class="cap-meta">
                ${escHtml(weekLabel(wk))} · ${escHtml(
            team?.owner || team?.name || ""
          )}
              </div>
  
              <div class="cap-tags">
                <span class="cap-tag captain">
                  ⭐ C: ${escHtml(cap?.name || "")}
                </span>
  
                <span class="cap-tag vc">
                  🔰 VC: ${escHtml(vc?.name || sel.vc)}
                </span>
              </div>
            </div>
  
            <button class="cap-delete"
              onclick="deleteCaptainEntry('${escHtml(wk)}','${teamId}')">
              ✕
            </button>
  
          </div>`;
        })
      )
      .join("");
  
    el.innerHTML = `
    
    <div class="card">
  
      <div class="section-title">
        Weekly Captain & Vice-Captain
      </div>
  
      <div class="cap-info-box">
        Captain earns <b>2×</b> points · Vice-captain earns <b>1.5×</b> points.
        Applied only to matches played within that <b>Mon–Sun week</b>.
      </div>
  
      <div class="grid-2">
  
        <div>
          <label class="form-label">Week (Mon–Sun)</label>
          <input 
            type="week"
            id="cap-week-input"
            class="inp"
            value="${todayYear}-W${todayWeekNum}"
            onchange="onCapWeekChange()"
          />
  
          <div id="cap-week-label" class="meta-text">
            ${weekLabel(todayKey)}
          </div>
        </div>
  
        <div>
          <label class="form-label">Fantasy Team</label>
  
          <select 
            class="inp"
            id="cap-team"
            onchange="updateCaptainPlayers()"
          >
            <option value="">Select team</option>
            ${(t.teams || [])
              .map(
                (tm) =>
                  `<option value="${tm.id}">
                    ${escHtml(tm.name)}${
                    tm.owner && norm(tm.owner) !== norm(tm.name)
                      ? " (" + escHtml(tm.owner) + ")"
                      : ""
                  }
                  </option>`
              )
              .join("")}
          </select>
  
        </div>
  
      </div>
  
      <div class="grid-2 mt">
  
        <div>
          <label class="form-label captain-label">
            Captain (2× points)
          </label>
  
          <select class="inp" id="cap-player">
            <option value="">Pick team first</option>
          </select>
        </div>
  
        <div>
          <label class="form-label vc-label">
            Vice Captain (1.5× points)
          </label>
  
          <select class="inp" id="vc-player">
            <option value="">Pick team first</option>
          </select>
        </div>
  
      </div>
  
      <button 
        class="btn btn-success full mt"
        onclick="saveCaptain()"
      >
        Save Captain for this Week
      </button>
  
    </div>
  
    ${
      weeks.length
        ? `
    <div class="card mt">
  
      <div class="section-title">
        Captain History
      </div>
  
      <div class="cap-history-list">
        ${historyRows || `<div class="meta-text">No captains set yet</div>`}
      </div>
  
    </div>`
        : ""
    }
  
    `;
  }

  
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

export function renderSubManual(t){

    const el=document.getElementById("sub-manual");
    
    const matches=(t.matches||[])
    .filter(m=>m.status==="completed")
    .map(m=>`<option value="${m.id}">${m.name}</option>`).join("");
    
    const players=(t.teams||[])
    .flatMap(tm=>tm.players||[])
    .map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
    
    el.innerHTML=`
    
    <div class="card">
    
    <div class="section-title">🎯 Match Bonus Points</div>
    
    <div class="grid-2">
    
    <div>
    <label class="form-label">Match</label>
    <select class="inp" id="manual-match">${matches}</select>
    </div>
    
    <div>
    <label class="form-label">Player</label>
    <select class="inp" id="manual-player">${players}</select>
    </div>
    
    </div>
    
    <div class="mt">
    
    <label class="form-label">Bonus Type</label>
    
    <select class="inp" id="manual-type">
    
    <option value="hatrick">Hat-trick</option>
    <option value="mom">Man of the Match</option>
    <option value="6s">6 Sixes in Over</option>
    <option value="4s">6 Fours in Over</option>
    <option value="bowled">Bowled/LBW Bonus</option>
    <option value="runout">Runout by Bowler</option>
    <option value="maiden">Maiden Over</option>
    
    </select>
    
    </div>
    
    <button class="btn btn-success full mt"
    onclick="applyManualPoints()">Apply Points</button>
    
    </div>
    
    
    <div class="card mt">
    
    <div class="section-title">🏆 Tournament Awards</div>
    
    <select class="inp" id="award-player">
    ${players}
    </select>
    
    <select class="inp mt" id="award-type">
    
    <option value="purple">Purple Cap</option>
    <option value="orange">Orange Cap</option>
    <option value="pot">Player of Tournament</option>
    <option value="emerging">Emerging Player</option>
    
    </select>
    
    <button class="btn btn-primary full mt"
    onclick="applyTournamentAward()">Give Award</button>
    
    </div>
    
    `;
    
    }
    

