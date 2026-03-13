
export async function fetchScores() {

  const sid = (document.getElementById('scores-sid')?.value || '').trim();
  const log = document.getElementById('scores-log');

  if(log){
    log.innerHTML='';
    log.style.display='block';
  }

  const t = getTournament();
  if(!t){
    addScoreLog('❌ No tournament selected.','var(--err)');
    return;
  }

  if(!Array.isArray(t.matches)){
    t.matches=[];
  }

  if(getHits() >= 95){
    addScoreLog('❌ API limit near (95+). Try tomorrow.','var(--err)');
    return;
  }

  if(!sid){
    addScoreLog('⚠️ Enter a Series ID.','var(--warn)');
    return;
  }

  const alreadyDone = new Set((t.matches||[]).map(m=>m.id));

  // ───── STEP 1: SERIES INFO ─────

  addScoreLog('📡 Fetching series info... (1 API hit)');

  let seriesData;

  try{

    seriesData = await fetch(
      `api/cricproxy.php?url=${encodeURIComponent(
      `https://api.cricapi.com/v1/series_info&id=${sid}`
      )}`
      )

    bumpHits(1);

  }catch(err){
    addScoreLog('❌ '+err.message,'var(--err)');
    return;
  }

  if(seriesData?.status!=='success'){
    addScoreLog('❌ '+(seriesData?.reason||'Series not found'),'var(--err)');
    return;
  }

  const allMatches = seriesData.data?.matchList || [];
  const seriesName = seriesData.data?.info?.name || sid;

  addScoreLog(`✅ "${seriesName}" — ${allMatches.length} matches found`,'var(--ok)');

  let updated = {
    ...t,
    teams:(t.teams||[]).map(x=>({...x,players:[...(x.players||[])]}))
  };

  // ───── MATCH STATUS COUNTERS ─────

  let upcoming = 0;
  let live = 0;
  let completed = 0;

  allMatches.forEach(m=>{
    if(m.matchEnded) completed++;
    else if(m.matchStarted) live++;
    else upcoming++;
  });

  addScoreLog(`📅 Upcoming: ${upcoming} · 🔴 Live: ${live} · ✅ Finished: ${completed}`,'var(--dim)');

  // ───── RECORD COMPLETED MATCH META ─────

  let metaAdded=0;

  allMatches.forEach(m=>{

if(alreadyDone.has(m.id)) return;

let status = "upcoming";

if(m.matchEnded) status = "completed";
else if(m.matchStarted) status = "live";

updated.matches.push({
  id: m.id,
  name: m.name,
  date: m.date,
  venue: m.venue || "",
  status: status,
  result: m.status || "",
  teamInfo: m.teamInfo || [],
  teams: m.teams || []
});

});

  if(metaAdded){
    addScoreLog(`📋 ${metaAdded} completed match results recorded`,'var(--acc)');
  }

  // ───── FIND MATCHES THAT NEED SCORING ─────

  const scoredMatchIds = new Set(
    (t.teams||[]).flatMap(tm=>
      (tm.players||[]).flatMap(p=>Object.keys(p.matchPoints||{}))
    )
  );

  const needScoring = allMatches.filter(m=>{

    if(scoredMatchIds.has(m.id)) return false;

    if(!m.matchEnded) return false;

    return true;

  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  // ───── NO MATCHES READY ─────

  if(!needScoring.length){

    if(completed===0){
      addScoreLog('ℹ️ No matches finished yet. Scores will appear after matches end.','var(--dim)');
    }else{
      addScoreLog('✅ All completed matches already scored.','var(--ok)');
    }

    updateTournament(updated);
    renderLeaderboard(getTournament());
    renderMatchesList(getTournament());

    return;
  }

  // ───── LIMIT API HITS ─────

  const remaining = Math.min(94-getHits(),10);

  const toScore = needScoring.slice(0,remaining);

  const skipped = needScoring.length - toScore.length;

  addScoreLog(`🏏 Scoring ${toScore.length} completed match(es)`,'var(--acc)');

  // ───── FETCH SCORECARDS ─────

  let scorecardHits=0;

  for(const match of toScore){

    if(getHits()>=94){
      addScoreLog('⚠️ Hit limit close — stopping.','var(--warn)');
      break;
    }

    const label = match.name.split(',')[0];

    addScoreLog(`⬇️ ${label}...`);

    try{

      const sc = await fetch(
        `api/cricproxy.php?url=${encodeURIComponent(
        `https://api.cricapi.com/v1/series_info&id=${sid}`
        )}`
        )

      scorecardHits++;
      bumpHits(1);

      if(sc?.status==='success' && sc.data){

        const ptsBefore = updated.teams.flatMap(t=>t.players)
          .reduce((s,p)=>s+(p.totalPoints||0),0);

        const normalized = normalizeScorecard(sc.data);

        updated = applyMatch(updated,match,normalized);

        const ptsAfter = updated.teams.flatMap(t=>t.players)
          .reduce((s,p)=>s+(p.totalPoints||0),0);

        const newPts = ptsAfter-ptsBefore;

        const innings = normalized.innings||[];

        if(!innings.length){

          addScoreLog('⚠️ Scorecard exists but innings not ready yet','var(--warn)');

        }else{

          const batRows = innings.reduce((s,i)=>s+(i.batting||[]).length,0);
          const bowlRows = innings.reduce((s,i)=>s+(i.bowling||[]).length,0);
          const fieldRows = innings.reduce((s,i)=>s+(i.catching||[]).length,0);

          addScoreLog(
            `✅ ${innings.length} innings · ${batRows} bat · ${bowlRows} bowl · ${fieldRows} field · +${newPts} pts`,
            'var(--ok)'
          );

        }

      }

    }catch(e){

      scorecardHits++;
      bumpHits(1);

      addScoreLog(`❌ ${e.message}`,'var(--err)');

    }

  }

  // ───── UPDATE UI ─────

  updateTournament(updated);

  renderLeaderboard(getTournament());
  renderMatchesList(getTournament());

  const totalHits = 1 + scorecardHits;

  addScoreLog(`✅ Sync finished · Hits used: ${totalHits} · Today: ${getHits()}/100`,'var(--ok)');

  if(skipped>0){
    addScoreLog(`ℹ️ Sync again to score ${skipped} remaining match(es)`,'var(--dim)');
  }

}


export function addScoreLog(line, color='var(--dim)') {
  const log = document.getElementById('scores-log');
  if(!log) return;
  log.style.display='block';
  const d=document.createElement('div');
  d.style.cssText=`color:${color};margin-bottom:4px`;
  d.textContent=line;
  log.appendChild(d);
  log.scrollTop=log.scrollHeight;
}

// Try to fetch player's country/team from CricAPI (returns empty string if unknown)
export async function getPlayerCountry(name) {
  if(!name) return '';
  if(PLAYER_COUNTRY_CACHE[name]) return PLAYER_COUNTRY_CACHE[name];
  try {
    const data = await fetch(`api/cricproxy.php?url=${encodeURIComponent(`https://api.cricapi.com/v1/players?apikey=${CRIC_API_KEY}&search=${encodeURIComponent(name)}&offset=0`)}`);
    const jsonData = await data.json();
    if(jsonData && Array.isArray(jsonData.data) && jsonData.data.length) {
      const p = jsonData.data[0];
      const country = p.country || p.country_name || p.team || p.nationality || p.teamName || p.nationalityName || '';
      PLAYER_COUNTRY_CACHE[name] = country || '';
      return PLAYER_COUNTRY_CACHE[name];
    }
  } catch(e) {
    // ignore and fallback to empty
  }
  PLAYER_COUNTRY_CACHE[name] = '';
  return '';
}

// Load full players list from CricAPI and populate PLAYER_COUNTRY_CACHE (with simple caching)
export async function loadPlayersList(force=false) {
  const key = 'cric_players_cache_v1';
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if(cached && !force && (Date.now() - (cached.ts||0) < 1000*60*60*24*7)) {
      Object.assign(PLAYER_COUNTRY_CACHE, cached.data || {});
      return;
    }
  } catch(e) {}

  // Fetch pages of players. Stop when empty page returned or safety cap reached.
  const pageSize = 1000;
  let offset = 0;
  const maxOffset = 50000;
  const accumulated = {};
  while(offset <= maxOffset){
    try{
      const url = `https://api.cricapi.com/v1/players?apikey=${API_KEY}&offset=${offset}`;
      const res = await fetch(`api/cricproxy.php?url=${encodeURIComponent(url)}`);
      const jsonData = await res.json();
      if(!jsonData || !Array.isArray(jsonData.data) || jsonData.data.length === 0) break;
      jsonData.data.forEach(p => { if(p && p.name) accumulated[p.name] = p.country || p.country_name || ''; });
      if(jsonData.data.length < pageSize) break;
      offset += pageSize;
    } catch(e){
      break;
    }
  }
  Object.assign(PLAYER_COUNTRY_CACHE, accumulated);
  try{ localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: accumulated })); }catch(e){}
}

// Populate all top-performer country spans asynchronously using the players list first
export async function populateTopPerformerCountries() {
  // ensure we have players list cached (non-forced)
  try{ await loadPlayersList(false); }catch(e){}
  const els = Array.from(document.querySelectorAll('.tp-country'));
  els.forEach(async el => {
    const name = el.dataset.playerName;
    if(!name) return;
    let country = lookupCountryFromCache(name);
    if(!country) {
      // fallback to search-by-name API
      try { country = await getPlayerCountry(name); } catch(e) { country = ''; }
    }
    el.textContent = country || '';
  });
}


