
import { state } from './core/state.js';
// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
const ADMIN_PASS = "26";

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
export function getTournament() {
  return state.tournaments.find(t => t.id === state.tId);
}

export function updateTournament(updated) {

  state.tournaments = state.tournaments.map(t =>
    t.id === updated.id ? updated : t
  );

  // Try to persist to server, fallback to localStorage
  (async()=>{
    try{
      await apiUpdateTournament(updated);
    }catch(e){
      try{ localStorage.setItem("fantasy_tournaments", JSON.stringify(state.tournaments)); }catch(err){}
    }
  })();

  // re-render UI
  if(state.page === 'tournament') {
    renderTournamentContent();
  }

}

export function updateApiBadge() {
  const badge = document.getElementById('api-badge');
  const hits = getHits();
  badge.textContent = `API ${hits}/100`;
  badge.style.background = hits>=90 ? 'rgba(248,113,113,.2)' : 'rgba(56,189,248,.15)';
  badge.style.border = `1px solid ${hits>=90?'rgba(248,113,113,.4)':'rgba(56,189,248,.4)'}`;
  badge.style.color = hits>=90 ? '#f87171' : '#38bdf8';
}

export function getHits(){
  const d = JSON.parse(localStorage.getItem("api_hits") || "{}");
  if(d.date === new Date().toDateString()) return d.hits || 0;
  return 0;
}

export function bumpHits(n){
  const today = new Date().toDateString();
  const current = getHits();

  const data = {
    date: today,
    hits: current + n
  };

  localStorage.setItem("api_hits", JSON.stringify(data));
  updateApiBadge();
}


// ═══════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════
export function playerLogin() {
  state.user = 'user';
  goPage('user-home');
}

export function showAdminForm() {
  document.getElementById('login-choose').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-err').style.display = 'none';
  setTimeout(()=>document.getElementById('login-pass').focus(), 50);
}

export function backToChoose() {
  document.getElementById('login-choose').style.display = 'flex';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('login-pass').value = '';
}

export function doAdminLogin() {
  const errEl = document.getElementById('login-err');
  const pass = document.getElementById('login-pass').value;
  if(pass !== ADMIN_PASS){ errEl.textContent='Wrong password'; errEl.style.display='block'; return; }
  state.user = 'admin';
  goPage('admin-home');
}

const modal = document.getElementById("rulesModal");

export function openModal() {
    modal.style.display = "block";
    document.body.style.overflow = "hidden"; // Prevent background scroll
}

export function closeModal() {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Restore scroll
}

export function handleWindowClick(event) {
  if (event.target == modal) {
      closeModal();
  }
}

window.onclick = handleWindowClick;
// ═══════════════════════════════════════════════════
// FUZZY NAME MATCHING
// ═══════════════════════════════════════════════════
const KNOWN = [
  "Virat Kohli","Rohit Sharma","Shubman Gill","KL Rahul","Shreyas Iyer",
  "Ravindra Jadeja","Hardik Pandya","Jasprit Bumrah","Arshdeep Singh",
  "Kuldeep Yadav","Mohammed Siraj","Rishabh Pant","Suryakumar Yadav",
  "Ishan Kishan","Sanju Samson","Abhishek Sharma","Rinku Singh","Shivam Dube",
  "Axar Patel","Varun Chakaravarthy","Ravi Bishnoi","Harshit Rana",
  "MS Dhoni","Yuzvendra Chahal","Washington Sundar","Prasidh Krishna",
  "Nitish Kumar Reddy","Tilak Varma","Yashasvi Jaiswal",
  "Joe Root","Ben Stokes","Jos Buttler","Ben Duckett","Harry Brook",
  "Jonny Bairstow","Zak Crawley","Jofra Archer","Mark Wood","Adil Rashid",
  "Daryl Mitchell","Kane Williamson","Devon Conway","Glenn Phillips",
  "Rachin Ravindra","Mitchell Santner","Tim Southee","Trent Boult",
  "Matt Henry","Kyle Jamieson","Ish Sodhi","Lockie Ferguson","Will Young",
  "Henry Nicholls","Michael Bracewell","Aiden Markram","Temba Bavuma",
  "Quinton de Kock","David Miller","Heinrich Klaasen","Kagiso Rabada",
  "Brydon Carse","Will Jacks","Jamie Smith","Saqib Mahmood","Wiaan Mulder",
  "Keshav Maharaj","Ryan Rickelton","Dewald Brevis","Nandre Burger",
  "Finn Allen","Matthew Breetzke","Senuran Muthusamy","Bevon Jacobs"
];



// updateCaptainPlayers moved into renderSubCaptain block

export function fuzzySuggest(name) {
  const nn = norm(name);
  return KNOWN.map(p => {
    const np = norm(p);
    if(np===nn) return {name:p,score:1};
    if(np.includes(nn)||nn.includes(np)) return {name:p,score:0.9};
    let m=0; for(let c of (nn.length<np.length?nn:np)) if((nn.length>=np.length?nn:np).includes(c)) m++;
    return {name:p, score:m/Math.max(nn.length,np.length)};
  }).filter(p=>p.score>=0.55).sort((a,b)=>b.score-a.score).slice(0,3);
}

// ═══════════════════════════════════════════════════
// TOURNAMENT VIEW
// ═══════════════════════════════════════════════════
let currentTab = 'leaderboard';

export function renderTournamentContent() {
  const t = getTournament();
  if(!t) return;

  // Show/hide manage tab
  document.getElementById('tab-btn-manage').style.display = state.user==='admin' ? 'block' : 'none';

  renderLeaderboard(t);
  renderMatchesList(t);
  if(state.user==='admin') renderManage(t);
  switchTab(currentTab);
}

export function switchTab(tab) {
  currentTab = tab;
  ['leaderboard','matches','manage'].forEach(k => {
    const content = document.getElementById('tab-'+k);
    const btn = document.getElementById('tab-btn-'+k);
    if(content) content.style.display = k===tab ? 'block' : 'none';
    if(btn){ btn.classList.toggle('active', k===tab); }
  });
}


// ── Manage Tab ────────────────────────────────────
let currentSubTab = 'upload';

export function applyManualPoints(){

const t=getTournament();

const matchId=document.getElementById("manual-match").value;
const playerId=document.getElementById("manual-player").value;
const type=document.getElementById("manual-type").value;

const bonus={
hatrick:100,
mom:100,
"6s":100,
"4s":50,
bowled:10,
runout:10,
maiden:40
}[type]||0;

const updated={...t,
teams:t.teams.map(tm=>({
...tm,
players:tm.players.map(p=>{
if(p.id!==playerId) return p;

const mp={...(p.matchPoints||{})};

const cur=mp[matchId]||{batting:0,bowling:0,fielding:0};

cur.bowling+=bonus;

mp[matchId]=cur;

return{
...p,
matchPoints:mp,
totalPoints:(p.totalPoints||0)+bonus
};

})
}))
};

updateTournament(updated);

alert("Bonus applied!");

}

export function applyTournamentAward(){

const t=getTournament();

const playerId=document.getElementById("award-player").value;

const type=document.getElementById("award-type").value;

const bonus=200;

const updated={...t,
teams:t.teams.map(tm=>({
...tm,
players:tm.players.map(p=>{
if(p.id!==playerId) return p;

return{
...p,
totalPoints:(p.totalPoints||0)+bonus
};
})
}))
};

updateTournament(updated);

alert("Award applied!");

}


// ── Upload More Teams ─────────────────────────────
let uploadState = { parsedTeams:[], suggestions:{}, choices:{}, stage:'idle' };

export function handleUploadFile(input) {
  const file = input.files[0]; input.value='';
  if(file) parseExcelForUpload(file);
}
export function handleUploadDrop(e) { if(e.dataTransfer.files[0]) parseExcelForUpload(e.dataTransfer.files[0]); }

export function parseExcelForUpload(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const msgEl = document.getElementById('upload-msg');
  if(!['xlsx','xls','csv'].includes(ext)) {
    msgEl.innerHTML='<div class="alert alert-err">❌ Upload .xlsx, .xls or .csv</div>';
    msgEl.style.display='block'; return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result,{type:'binary'});
      const skip=['batsman','bowler','catcher','processed','matchinfo','errorlog','sheet10','rules','points'];
      const hkw=['player','name','team','no','sl','sr','runs','balls','wickets','overs','economy','points'];
      const teams=[];
      wb.SheetNames.forEach(sn=>{
        if(skip.includes(sn.toLowerCase())) return;
        const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:''});
        const names=[];
        rows.forEach(row=>{for(let cell of row){const v=String(cell||'').trim();if(!v||v.length<2||!/[a-zA-Z]/.test(v)||/^\d+$/.test(v))continue;if(hkw.some(h=>v.toLowerCase()===h))continue;names.push(v);break;}});
        if(names.length>=2) teams.push({name:sn,players:[...new Set(names)]});
      });
      if(!teams.length){ msgEl.innerHTML='<div class="alert alert-err">❌ No teams found.</div>'; msgEl.style.display='block'; return; }
      const sugg={};
      teams.forEach(t=>t.players.forEach(p=>{const m=fuzzySuggest(p);if(!m.find(x=>norm(x.name)===norm(p))&&m.length&&m[0].score<0.98)sugg[p]=m;}));
      uploadState = { parsedTeams:teams, suggestions:sugg, choices:{}, stage: Object.keys(sugg).length?'resolve':'preview' };
      showUploadStage();
    } catch(err) {
      msgEl.innerHTML=`<div class="alert alert-err">❌ ${err.message}</div>`; msgEl.style.display='block';
    }
  };
  reader.readAsBinaryString(file);
}

export function showUploadStage() {
  const el = document.getElementById('sub-upload');
  const {stage, parsedTeams, suggestions, choices} = uploadState;

  if(stage==='resolve') {
    const entries = Object.entries(suggestions);
    const allDone = entries.every(([o])=>choices[o]);
    el.innerHTML = `
      <div class="alert alert-warn mb-16"><div class="fw-700">⚠️ ${entries.length} name(s) need confirmation</div></div>
      ${entries.map(([orig,suggs])=>`
        <div class="card mb-14" style="border:1px solid rgba(251,191,36,.25)">
          <div class="mb-8"><span class="txt-dim fs-12">Found: </span><strong class="txt-warn">"${escHtml(orig)}"</strong></div>
          <div class="flex" style="flex-wrap:wrap;gap:8px">
            ${suggs.map(s=>`<button class="name-pill ${choices[orig]===s.name?'selected':''}" onclick="uploadPickName('${escAttr(orig)}','${escAttr(s.name)}')">${escHtml(s.name)} <span style="color:var(--dim);font-size:10px;margin-left:5px">${Math.round(s.score*100)}%</span></button>`).join('')}
            <button class="name-pill keep-orig ${choices[orig]===orig?'selected':''}" onclick="uploadPickName('${escAttr(orig)}','__KEEP__')">Keep "${escHtml(orig)}"</button>
          </div>
        </div>
      `).join('')}
      <div class="flex gap-12">
        <button class="btn btn-success" ${allDone?'':'disabled'} onclick="uploadState.stage='preview';showUploadStage()">Confirm →</button>
        <button class="btn btn-ghost" onclick="uploadState.choices={};uploadState.stage='preview';showUploadStage()">Skip</button>
        <button class="btn btn-ghost" onclick="renderSubUpload(getTournament())">Cancel</button>
      </div>
    `;
  } else if(stage==='preview') {
    el.innerHTML = `
      <div class="fw-700 txt-main mb-16" style="font-size:16px">Preview — ${parsedTeams.length} team(s)</div>
      ${parsedTeams.map(team=>`
        <div class="card mb-14">
          <div class="flex jc-between mb-12"><div class="fw-800 txt-main fs-15">${escHtml(team.name)}</div><span class="badge" style="background:var(--accd);border:1px solid var(--bdra);color:var(--acc)">${team.players.length} players</span></div>
          <div>${team.players.map(p=>{const res=choices[p];const cor=res&&res!==p;return`<span class="ptag ${cor?'corrected':''}">${escHtml(res||p)}${cor?'<span style="font-size:9px"> ✓</span>':''}</span>`;}).join('')}</div>
        </div>
      `).join('')}
      <div class="flex gap-12">
        <button class="btn btn-success" onclick="saveUploadedTeams()">✅ Save Teams</button>
        <button class="btn btn-ghost" onclick="renderSubUpload(getTournament())">Cancel</button>
      </div>
    `;
  }
}

export function uploadPickName(orig, chosen) {
  uploadState.choices[orig] = chosen==='__KEEP__' ? orig : chosen;
  showUploadStage();
}

export function saveUploadedTeams() {
  const t = getTournament();
  const {parsedTeams, choices} = uploadState;
  const existing = (t.teams||[]).map(x=>norm(x.name));
  const toAdd = parsedTeams
    .filter(team=>!existing.includes(norm(team.name)))
    .map(team=>({
      id:makeId('t'), name:team.name,
      players:team.players.map(p=>({id:makeId('p'),name:choices[p]||p,originalName:p,totalPoints:0,battingPoints:0,bowlingPoints:0,fieldingPoints:0,matchPoints:{},isInjured:false}))
    }));
  const updated = {...t, teams:[...(t.teams||[]),...toAdd]};
  updateTournament(updated);
  uploadState = {parsedTeams:[],suggestions:{},choices:{},stage:'idle'};
  renderSubUpload(updated);
  const msgEl = document.getElementById('upload-msg');
  if(msgEl){ msgEl.innerHTML=`<div class="alert alert-ok">✅ Added ${toAdd.length} team(s)!</div>`; msgEl.style.display='block'; }
}



// Cache for player -> country lookups
const PLAYER_COUNTRY_CACHE = {};


// Lookup helper: try exact, then normalized match in PLAYER_COUNTRY_CACHE
export function lookupCountryFromCache(name) {
  if(!name) return '';
  if(PLAYER_COUNTRY_CACHE[name]) return PLAYER_COUNTRY_CACHE[name];
  const nn = norm(name);
  for(const k of Object.keys(PLAYER_COUNTRY_CACHE)){
    if(norm(k) === nn) return PLAYER_COUNTRY_CACHE[k];
  }
  return '';
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

export function recordMatchOnly(tournament, matchInfo) {
  if((tournament.matches||[]).find(m => m.id === matchInfo.id)) return tournament;
  return {
    ...tournament,
    matches: [...(tournament.matches||[]), {
      id:       matchInfo.id,
      name:     matchInfo.name,
      date:     matchInfo.date,
      venue:    matchInfo.venue || '',
      status:   'completed',
      result:   matchInfo.status || '',
      teamInfo: matchInfo.teamInfo || []
    }]
  };
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
document.getElementById('page-login').classList.add('active');

loadTournamentsFromServer().then(()=>{
    // render current page if needed
    if(state.page === 'user-home') renderUserHome();
    if(state.page === 'admin-home') renderAdminHome();
  });

