import { state } from "./state.js"
import { renderPage } from "../render/renderPage.js"
import { updateApiBadge } from '../tournamentcontroller.js'
import { getTournament } from "../tournamentcontroller.js";
// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
export function goPage(page, opts={}) {
  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if(el){ el.classList.add('active'); el.classList.remove('fu'); void el.offsetWidth; el.classList.add('fu'); }

  const topbar = document.getElementById('topbar');
  const backBtn = document.getElementById('back-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const apiBadge = document.getElementById('api-badge');
  const pageTitleEl = document.getElementById('page-title');
  const pageSubEl = document.getElementById('page-sub');

  if(page === 'login'){
    topbar.style.display = 'none';
  } else {
    topbar.style.display = 'block';
    logoutBtn.style.display = 'block';
    apiBadge.style.display = state.user==='admin' ? 'inline-block' : 'none';
    updateApiBadge();
  }

  // Back button logic
  const backMap = {
    'user-home': null,
    'admin-home': null,
    'new-tournament': 'admin-home',
    'resolve': 'new-tournament',
    'preview': 'new-tournament',
    'tournament': state.user==='admin' ? 'admin-home' : 'user-home',
  };
  const backTarget = backMap[page];
  backBtn.style.display = backTarget ? 'block' : 'none';
  backBtn.onclick = () => goPage(backTarget);

  // Titles
  const titles = {
    'user-home': ['Tournaments', null],
    'admin-home': ['Admin Dashboard', null],
    'new-tournament': ['New Tournament', null],
    'resolve': ['Verify Player Names', `${Object.keys(state.wiz.suggestions).length} name(s) need confirmation`],
    'preview': ['Review & Create', `${state.wiz.parsedTeams.length} teams · ${state.wiz.parsedTeams.reduce((s,t)=>s+t.players.length,0)} players`],
    'tournament': [getTournament()?.name||'', `${getTournament()?.startDate||''} · ${(getTournament()?.teams||[]).length} teams`],
  };
  const [title, sub] = titles[page] || ['', null];
  pageTitleEl.textContent = title;
  pageSubEl.textContent = sub || '';
  pageSubEl.style.display = sub ? 'block' : 'none';

  state.page = page;

  // Render page content
  renderPage(page);
}

export function navBack() {
  const backMap = {
    'new-tournament': 'admin-home',
    'resolve': 'new-tournament',
    'preview': 'new-tournament',
    'tournament': state.user==='admin' ? 'admin-home' : 'user-home',
  };
  const target = backMap[state.page];
  if(target) goPage(target);
}

export function logout() {
  state.user = null;
  goPage('login');
}
