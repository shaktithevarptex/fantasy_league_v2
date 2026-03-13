export function renderNewTournament() {
    document.getElementById('wiz-name').value = state.wiz.tName || '';
    document.getElementById('wiz-sid').value = state.wiz.sid || '';
    document.getElementById('wiz-upload-msg').style.display = 'none';
    updateWizParsedBanner();
  }

export function parseExcel(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const msgEl = document.getElementById('wiz-upload-msg');
    if(!['xlsx','xls','csv'].includes(ext)) {
      msgEl.textContent = '❌ Upload .xlsx, .xls or .csv'; msgEl.style.display='block'; return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, {type:'binary'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
  
        const teams = parseAuctionSheet(rows);
  
        if(!teams.length) {
          msgEl.textContent = '❌ No teams found. Make sure the sheet follows the auction format (owner names in row 1, players below).';
          msgEl.style.display='block'; return;
        }
  
        // API-based name validation (async, show results after)
        msgEl.style.display='none';
        state.wiz.parsedTeams = teams;
        state.wiz.suggestions = {};
        state.wiz.choices = {};
        updateWizParsedBanner();
  
        // Kick off async API name check in background
        validateNamesViaAPI(teams).then(sugg => {
          state.wiz.suggestions = sugg;
          updateWizParsedBanner();
        });
  
      } catch(err) {
        msgEl.textContent = '❌ Error: ' + err.message;
        msgEl.style.display = 'block';
      }
    };
    reader.readAsBinaryString(file);
  }

  // Use CricAPI players search to validate names
  export async function validateNamesViaAPI(teams) {
  const sugg = {};
  const allNames = [...new Set(teams.flatMap(t => t.players.map(p => p.name)))];
  // Only check names that don't closely match our local known list
  const suspicious = allNames.filter(name => {
    const best = fuzzySuggest(name);
    return !best.length || best[0].score < 0.85;
  });
  if(!suspicious.length) return sugg;

  // Show validating message
  const banner = document.getElementById('wiz-parsed-banner');
  if(banner) banner.textContent += ' — 🔍 Validating names via API...';

  for(const name of suspicious.slice(0, 10)) { // limit API calls
    try {
      const data = await fetch(`https://api.cricapi.com/v1/players?apikey=${API_KEY}&search=${encodeURIComponent(name)}&offset=0`);
      if(data?.status === 'success' && data.data?.length) {
        const matches = data.data.slice(0,3).map(p => ({name: p.name, score: 0.9}));
        // Only flag if API returns different name
        if(matches.length && norm(matches[0].name) !== norm(name)) {
          sugg[name] = matches;
        }
      }
    } catch(e) {
      // API failed, fall back to local fuzzy for this name
      const local = fuzzySuggest(name);
      if(local.length && local[0].score < 0.98) sugg[name] = local;
    }
  }
  if(banner) banner.textContent = banner.textContent.replace(' — 🔍 Validating names via API...', ' — ✅ Names validated');
  return sugg;
}

export function createTournament() {
  const {tName, sid, parsedTeams, choices} = state.wiz;
  if(!tName.trim()) return;
  if(!sid.trim()) { alert('Series ID is required!'); return; }
  const teams = parsedTeams.map(team => ({
    id: makeId('t'),
    name: team.name,
    owner: team.owner || team.name,
    players: team.players.map(p => ({
      id: makeId('p'),
      name: choices[p.name] || p.name,
      originalName: p.name,
      price: p.price || 0,
      owner: team.owner || team.name,
      totalPoints:0, battingPoints:0, bowlingPoints:0, fieldingPoints:0,
      matchPoints:{}, isInjured:false
    }))
  }));
  const newT = {
    id: Date.now().toString(),
    name: tName, weeklyCaptains:{}, seriesId: sid, status:'active',
    startDate: new Date().toISOString().split('T')[0],
    teams, matches:[], createdAt:Date.now()
  };
  state.tournaments.push(newT);
  // Persist to server (if available) otherwise keep local copy
  (async()=>{
    try{
      const payload = { ...newT };
      // send full tournament structure (teams/players)
      const resp = await apiSaveTournament(payload);
      if(resp && resp.status === 'success' && resp.id){
        // use server id
        newT.id = String(resp.id);
        // reload from server to get consistent IDs, but simple replace for now
      }
    }catch(e){
      try{ localStorage.setItem("fantasy_tournaments", JSON.stringify(state.tournaments)); }catch(err){}
    }
  })();
  state.wiz = { tName:'', sid:'', parsedTeams:[], suggestions:{}, choices:{} };
  goPage('admin-home');
}

// ═══════════════════════════════════════════════════
// WIZARD — NEW TOURNAMENT
// ═══════════════════════════════════════════════════

export function updateWizParsedBanner() {
  const banner = document.getElementById('wiz-parsed-banner');
  const nextBtn = document.getElementById('wiz-next-btn');
  const hint = document.getElementById('wiz-next-hint');
  if(state.wiz.parsedTeams.length) {
    const total = state.wiz.parsedTeams.reduce((s,t)=>s+t.players.length,0);
    const owners = state.wiz.parsedTeams.map(t=>t.owner||t.name).join(', ');
    banner.innerHTML = `✅ <strong>${state.wiz.parsedTeams.length} owner teams</strong> parsed · <strong>${total} players</strong> total<br><span style="font-size:11px;opacity:.8">Owners: ${escHtml(owners)}</span>`;
    banner.style.display = 'block';
    nextBtn.style.display = 'block';
    hint.style.display = 'none';
  } else {
    banner.style.display = 'none';
    nextBtn.style.display = 'none';
    hint.style.display = 'block';
  }
}

export function handleWizFile(input) {
  const file = input.files[0];
  input.value = '';
  if(file) parseExcel(file);
}

export function handleWizDrop(event) {
  const file = event.dataTransfer.files[0];
  if(file) parseExcel(file);
}

// Parse auction-style sheet:
// Row 0: [maybe_empty, Owner1, Price_header_or_empty, maybe_empty, Owner2, ...]
// Row 1+: [maybe_empty, PlayerName, Price, maybe_empty, PlayerName, Price, ...]
// IMPORTANT: Col A may or may not exist as a cell — XLSX sparse arrays
// So we scan ALL columns (0 onwards) for owner names

export function parseAuctionSheet(rows) {
  if(!rows.length) return [];

  const isText  = v => { const s=String(v||'').trim(); return s.length>=2 && /[a-zA-Z]/.test(s) && !/^\d+(\.\d+)?$/.test(s); };
  const isNum   = v => { const s=String(v||'').trim(); return s!=='' && !isNaN(parseFloat(s)); };
  const clean   = v => String(v||'').trim();

  // ── Step 1: Find the owner row ─────────────────────────────
  // It's the FIRST row that has ≥2 text cells (owner names).
  // Works regardless of whether col A exists or is blank.
  let ownerRow = null, ownerRowIdx = 0;
  for(let r = 0; r < Math.min(6, rows.length); r++) {
    const row = rows[r] || [];
    const textCount = row.filter(isText).length;
    if(textCount >= 2) { ownerRow = row; ownerRowIdx = r; break; }
    // Also accept 1 text cell if it has at least one numeric sibling (single-team edge case)
    if(textCount === 1 && row.filter(isNum).length >= 1) { ownerRow = row; ownerRowIdx = r; break; }
  }
  if(!ownerRow) return [];

  // ── Step 2: Locate each team's name column and price column ─
  // Scan ALL columns (0-based) — handles both col-A-missing and col-A-present cases.
  const teamCols = [];
  for(let c = 0; c < ownerRow.length; c++) {
    if(!isText(ownerRow[c])) continue;
    const owner = clean(ownerRow[c]);

    // Find the price column: first numeric cell in data rows starting from c+1
    // Look in cols c+1 and c+2 (in case there's a gap)
    let priceCol = -1;
    for(let pc = c+1; pc <= c+2 && pc < (ownerRow.length + 2); pc++) {
      // Check 2-3 data rows to confirm it's consistently numeric
      let numericCount = 0;
      for(let r = ownerRowIdx+1; r < Math.min(ownerRowIdx+4, rows.length); r++) {
        if(isNum((rows[r]||[])[pc])) numericCount++;
      }
      if(numericCount >= 1) { priceCol = pc; break; }
    }
    if(priceCol === -1) priceCol = c + 1; // fallback

    teamCols.push({ nameCol: c, priceCol, owner });
  }
  if(!teamCols.length) return [];

  // ── Step 3: Collect players for each team ──────────────────
  return teamCols.map(({ nameCol, priceCol, owner }) => {
    const players = [];
    for(let r = ownerRowIdx + 1; r < rows.length; r++) {
      const row  = rows[r] || [];
      const name = clean(row[nameCol]);
      if(name.length >= 3 && /[a-zA-Z]/.test(name) && !isNum(name)) {
        players.push({ name, price: parseFloat(row[priceCol]) || 0, owner });
      }
    }
    return players.length ? { name: owner, owner, players } : null;
  }).filter(Boolean);
}

export function wizNext() {
  state.wiz.tName = document.getElementById('wiz-name').value.trim();
  state.wiz.sid   = document.getElementById('wiz-sid').value.trim();
  if(!state.wiz.tName){ alert('Please enter a tournament name.'); return; }
  if(!state.wiz.sid){ alert('Series ID is required — paste it from CricAPI.'); return; }
  const hasSugg = Object.keys(state.wiz.suggestions).length > 0;
  goPage(hasSugg ? 'resolve' : 'preview');
}


