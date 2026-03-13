
// ═══════════════════════════════════════════════════
// RESOLVE PAGE
// ═══════════════════════════════════════════════════
export function renderResolve() {
  const container = document.getElementById('resolve-items');
  container.innerHTML = '';
  const entries = Object.entries(state.wiz.suggestions);
  entries.forEach(([orig, suggs]) => {
    const card = document.createElement('div');
    card.className = 'card mb-16';
    card.style.border = '1px solid rgba(251,191,36,.25)';
    card.innerHTML = `
      <div class="flex items-center gap-14 mb-12">
        <span style="font-size:18px">⚠️</span>
        <div>
          <div class="txt-dim fs-11">Found in Excel:</div>
          <div class="fw-800 txt-warn" style="font-size:15px">"${escHtml(orig)}"</div>
        </div>
      </div>
      <div class="txt-dim fs-12 mb-8">Did you mean?</div>
      <div class="flex" style="flex-wrap:wrap;gap:8px" id="pills-${escId(orig)}">
        ${suggs.map(s=>`
          <button class="name-pill ${state.wiz.choices[orig]===s.name?'selected':''}"
            onclick="pickName('${escId(orig)}','${escAttr(orig)}','${escAttr(s.name)}')">
            ${escHtml(s.name)} <span style="color:var(--dim);font-size:10px;margin-left:6px">${Math.round(s.score*100)}%</span>
          </button>
        `).join('')}
        <button class="name-pill keep-orig ${state.wiz.choices[orig]===orig?'selected':''}"
          onclick="pickName('${escId(orig)}','${escAttr(orig)}','__KEEP__')">
          Keep "${escHtml(orig)}"
        </button>
      </div>
    `;
    container.appendChild(card);
  });
  updateResolveBtn();
}

export function pickName(escapedOrig, orig, chosen) {
  state.wiz.choices[orig] = chosen==='__KEEP__' ? orig : chosen;
  // Re-render pills for this item
  const pillsEl = document.getElementById('pills-'+escapedOrig);
  if(pillsEl) {
    pillsEl.querySelectorAll('.name-pill').forEach(btn => {
      const isKeep = btn.classList.contains('keep-orig');
      const btnText = btn.textContent.trim().split(' ')[0]; // rough match
      btn.classList.remove('selected');
      if(isKeep && state.wiz.choices[orig]===orig) btn.classList.add('selected');
      else if(!isKeep && state.wiz.choices[orig] && btn.textContent.includes(state.wiz.choices[orig])) btn.classList.add('selected');
    });
    // Simpler: just re-render the whole resolve page
    renderResolve();
  }
  updateResolveBtn();
}

export function updateResolveBtn() {
  const entries = Object.entries(state.wiz.suggestions);
  const allDone = entries.every(([o])=>state.wiz.choices[o]);
  const btn = document.getElementById('resolve-confirm-btn');
  if(btn){ btn.disabled = !allDone; }
  const hint = document.getElementById('resolve-hint');
  if(hint){ hint.style.display = allDone?'none':'block'; }
}

export function resolveConfirm() { goPage('preview'); }
export function resolveSkip() { state.wiz.choices = {}; goPage('preview'); }
