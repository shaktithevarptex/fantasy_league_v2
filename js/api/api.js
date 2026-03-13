// Try to load tournaments from API; fall back to localStorage if API unavailable
export async function loadTournamentsFromServer(){
  try{
    const res = await fetch('api/get_tournaments.php');
    const j = await res.json();
    if(j && j.status === 'success' && Array.isArray(j.data)){
      state.tournaments = j.data.map(t => ({
        ...t,
        id: String(t.id),
        teams: (t.teams||[]).map(tm => ({ ...tm, id: String(tm.id), players: (tm.players||[]).map(p=>({ ...p, id: String(p.id) })) }))
      }));
      return;
    }
  } catch(e){ /* ignore and fallback */ }

  const saved = localStorage.getItem("fantasy_tournaments");
  if(saved){ state.tournaments = JSON.parse(saved); }
}

// API helpers for saving/updating/deleting tournaments
export async function apiSaveTournament(tournament){
  const res = await fetch('api/save_tournament.php',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(tournament) });
  return res.json();
}

export async function apiUpdateTournament(tournament){
  const res = await fetch('api/update_tournament.php',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(tournament) });
  return res.json();
}

export async function apiDeleteTournament(id){
  const res = await fetch('api/delete_tournament.php',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
  return res.json();
}

// CORS-safe fetch with multiple proxy fallbacks
export async function fetch(url) {
  const proxies = [
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];
  try {
    const r = await fetch(url, {mode:'cors'});
    if(r.ok) return await r.json();
  } catch(e) {}
  for(const px of proxies) {
    try {
      const r = await fetch(px(url), {signal: AbortSignal.timeout(8000)});
      if(!r.ok) continue;
      const txt = await r.text();
      try { const j=JSON.parse(txt); if(j.contents) return JSON.parse(j.contents); return j; } catch(e2){}
    } catch(e) {}
  }
  throw new Error('All CORS proxies failed — try a browser CORS extension.');
}
