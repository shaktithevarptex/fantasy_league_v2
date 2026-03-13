// ═══════════════════════════════════════════════════
// PREVIEW PAGE
// ═══════════════════════════════════════════════════
export function renderPreview() {
  const { parsedTeams, choices, tName, sid } = state.wiz;
  const total = parsedTeams.reduce((s, t) => s + t.players.length, 0);

  document.getElementById("preview-summary").innerHTML = `
    <div class="preview-stat">
      <div class="stat-label">Tournament</div>
      <div class="stat-value">${escHtml(tName) || "(no name)"}</div>
    </div>

    <div class="preview-stat">
      <div class="stat-label">Teams</div>
      <div class="stat-value">${parsedTeams.length}</div>
    </div>

    <div class="preview-stat">
      <div class="stat-label">Players</div>
      <div class="stat-value">${total}</div>
    </div>

    ${
      sid
        ? `<div class="preview-stat">
            <div class="stat-label">Series</div>
            <div class="stat-value small">${escHtml(sid.slice(0, 28))}…</div>
           </div>`
        : ""
    }
  `;

  const grid = document.getElementById("preview-teams");
  grid.innerHTML = "";

  parsedTeams.forEach((team) => {
    const card = document.createElement("div");
    card.className = "preview-card";

    const playerList = team.players
      .map((p) => {
        const res = choices[p.name];
        const corrected = res && res !== p.name;
        const display = res || p.name;

        return `
        <div class="player-row">
          <span class="player-name ${corrected ? "corrected" : ""}">
            ${escHtml(display)}
          </span>
          ${
            p.price
              ? `<span class="player-price">${p.price}Cr</span>`
              : ""
          }
        </div>`;
      })
      .join("");

    card.innerHTML = `
      <div class="preview-card-header">
        <div>
          <div class="team-owner">${escHtml(team.owner || team.name)}</div>
          <div class="team-meta">${team.players.length} players</div>
        </div>
      </div>

      <div class="player-list">
        ${playerList}
      </div>
    `;

    grid.appendChild(card);
  });

  const noNameWarn = document.getElementById("preview-no-name-warn");
  const createBtn = document.getElementById("preview-create-btn");

  if (!tName.trim()) {
    noNameWarn.style.display = "block";
    createBtn.disabled = true;
  } else {
    noNameWarn.style.display = "none";
    createBtn.disabled = false;
  }
}
