export function calcBat(runs, balls, fours, sixes, sr, duck, notOut=false) {
    // Exactly matches GAS sheet formulas:
    // J  = duck (faced ball, 0 runs) → -10, else runs * 1  (1pt/run)
    // K  = cumulative milestones: +25 at each of 25,50,75,100,125,150,175,200 crossed
    // L  = SR bonus/penalty (GAS formula exactly, using API-provided SR)
    // M  = L if balls >= 25, else 0   (GAS: IF(balls>=25, L, 0))
    // N  = fours * 1
    // O  = sixes * 2
    // Total = J + K + M + N + O
  
    // J — base
    const J = duck ? -10 : runs;
  
    // K — cumulative milestone bonus
    let K = 0;
    for(const t of [25,50,75,100,125,150,175,200]) { if(runs >= t) K += 25; }
  
    // L — SR bonus/penalty decoded from GAS:
    // IF(SR<75,-20,0)+IF(SR<100,-10,0)+IF(SR<=125,-10,0)+IF(SR<=150,0)
    // +IF(SR>=150,10)+IF(SR>=175,10)+IF(SR>=200,20)+IF(SR>=250,20)
    // +IF(SR>=300,20)+IF(SR>=350,20)+IF(SR>=400,20)
    let L = 0;
    if(sr < 75)  L += -20;
    if(sr < 100) L += -10;
    if(sr <= 125) L += -10;
    // 126-149: no change
    if(sr >= 150) L += 10;
    if(sr >= 175) L += 10;
    if(sr >= 200) L += 20;
    if(sr >= 250) L += 20;
    if(sr == 300 && sr<=350) L += 80;
    
    if(sr > 350) L += 100;
  
    // M — SR bonus only if 25+ balls faced
    const M = balls >= 25 ? L : 0;
  
    // N, O — boundaries
    const N = fours * 1;
    const O = sixes * 2;
  
    return J + K + M + N + O;
  }
  
  export function calcBowl(wkts, maidens, runs, oversDec, eco) {
  
  let pts = 0;
  
  // Wickets
  pts += wkts * 25;
  
  // Wicket haul bonus
  if(wkts >= 8) pts += 175;
  else if(wkts == 7) pts += 150;
  else if(wkts == 6) pts += 125;
  else if(wkts == 5) pts += 100;
  else if(wkts == 4) pts += 75;
  else if(wkts == 3) pts += 50;
  
  // Maiden overs
  pts += maidens * 40;
  
  // Economy (min 2 overs)
  if(oversDec >= 2){
  
    if(eco < 1) pts += 100;
    else if(eco < 2) pts += 80;
    else if(eco < 4) pts += 40;
    else if(eco < 6) pts += 20;
    else if(eco < 8) pts += 10;
    else if(eco <= 10) pts += 0;
    if(eco > 16) pts -= 60;
  else if(eco > 14) pts -= 40;
  else if(eco > 12) pts -= 20;
  else if(eco > 10) pts -= 10;
  
  }
  
  return pts;
  
  }

  export function applyMatch(tournament, matchInfo, scorecard) {
    const mid = matchInfo.id;
    const dbg = [];
  
    const updatedTeams = (tournament.teams||[]).map(team => ({
      ...team,
      players: (team.players||[]).map(player => {
        if(player.isInjured) return player;
        const pn = norm(player.name);
        let bat = 0, bowl = 0, field = 0;
        let foundBat = false, foundBowl = false;
        let cricketTeam = player.cricketTeam || '';
  
        (scorecard.innings||[]).forEach(inn => {
          // "India Inning 1" → "India"
          const innTeam = (inn.inning||'').replace(/\s*(\d+\w*)?\s*(inning|innings).*/i,'').trim();
  
          // ── BATTING ──────────────────────────────────────────────
          (inn.batting||[]).forEach(b => {
            const bname = norm(b.batsman?.name || b.name || '');
            if(bname !== pn) return;
            foundBat = true;
            if(!cricketTeam && innTeam) cricketTeam = innTeam;
            const runs  = +(b.r  ?? b.runs  ?? 0);
            const balls = +(b.b  ?? b.balls ?? 0);
            const fours = +(b['4s'] ?? b.fours ?? 0);
            const sixes = +(b['6s'] ?? b.sixes ?? 0);
            // Use API-provided SR; fallback to calculated
            const sr    = b.sr ? parseFloat(b.sr) : (balls > 0 ? (runs/balls)*100 : 0);
            const duck  = runs === 0 && balls > 0;
            const notOut= ((b.dismissal||'')+(b['dismissal-text']||'')).toLowerCase().includes('not out');
            bat += calcBat(runs, balls, fours, sixes, sr, duck, notOut);
            dbg.push(`BAT ${player.name}: ${runs}(${balls}) SR:${sr.toFixed(1)} 4s:${fours} 6s:${sixes} = ${bat}pts`);
          });
  
          // ── BOWLING ──────────────────────────────────────────────
          (inn.bowling||[]).forEach(bw => {
            const bwname = norm(bw.bowler?.name || bw.name || '');
            if(bwname !== pn) return;
            foundBowl = true;
            const wkts    = +(bw.w  ?? bw.wickets ?? 0);
            const maiden  = +(bw.m  ?? bw.maidens ?? 0);
            const runs_g  = +(bw.r  ?? bw.runs    ?? 0);
            const oversStr= String(bw.o ?? bw.overs ?? '0');
            const oversDec= parseOvers(oversStr);
            const eco     = bw.eco ? parseFloat(bw.eco) : (oversDec > 0 ? runs_g/oversDec : 0);
            bowl += calcBowl(wkts, maiden, runs_g, oversDec, eco);
            dbg.push(`BOWL ${player.name}: ${wkts}w ${maiden}m ${runs_g}r ${oversStr}ov eco:${eco.toFixed(2)} = ${bowl}pts`);
          });
  
          // ── FIELDING — from catching[] (confirmed by GAS script) ─────
          // GAS fields: catcher.name, catch, runout, stumped, lbw, bowled
          // lbw + bowled = no fielding pts (no physical dismissal action by fielder)
          (inn.catching||[]).forEach(c => {
            const cname = norm(c.catcher?.name || c.name || '');
            if(cname !== pn) return;
            const catches   = +(c.catch   || 0);
            const runouts   = +(c.runout  || 0);
            const stumpings = +(c.stumped || 0);
            field += catches   * 10;   // catch  = 10pts
            field += runouts   * 10;   // run-out = 10pts
            field += stumpings * 15;   // stumping = 15pts (harder, more skill)
            dbg.push(`FIELD ${player.name}: ${catches}c ${runouts}ro ${stumpings}st = +${catches*10+runouts*10+stumpings*15}pts`);
          });
        });
  
        if(foundBat || foundBowl || field > 0) {
          console.log(`[MATCH ${mid.slice(0,8)}]`, dbg.join(' | '));
        }
  
        const mp = { batting: bat, bowling: bowl, fielding: field };
        return {
          ...player,
          cricketTeam,
          matchPoints:    { ...(player.matchPoints||{}), [mid]: mp },
          battingPoints:  (player.battingPoints||0)  + bat,
          bowlingPoints:  (player.bowlingPoints||0)  + bowl,
          fieldingPoints: (player.fieldingPoints||0) + field,
          totalPoints:    (player.totalPoints||0)    + bat + bowl + field,
        };
      })
    }));
  
    const already = (tournament.matches||[]).find(m => m.id === mid);
    const newMatches = already
      ? tournament.matches.map(m => m.id === mid
          ? { ...m, status:'completed', result:matchInfo.status, teamInfo:matchInfo.teamInfo||m.teamInfo||[] }
          : m)
      : [...(tournament.matches||[]), {
          id:       mid,
          name:     matchInfo.name,
          date:     matchInfo.date,
          venue:    matchInfo.venue || '',
          status:   'completed',
          result:   matchInfo.status,
          teamInfo: matchInfo.teamInfo || []
        }];
  
    return { ...tournament, teams: updatedTeams, matches: newMatches };
  }

  // Convert CricAPI overs string "3.4" (3 overs, 4 balls) to decimal (3.667)
export function parseOvers(oversStr) {
  const parts = String(oversStr||'0').split('.');
  const fullOvers = parseInt(parts[0]) || 0;
  const balls     = parseInt(parts[1]) || 0;
  return fullOvers + (balls / 6);
}