// Visualization Script

const template = `
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  h2 { color: #333; border-bottom: 2px solid #ff6c37; padding-bottom: 5px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
  th { background-color: #ff6c37; color: white; }
  tr:nth-child(even) { background-color: #f9f9f9; }
  tr:hover { background-color: #f1f1f1; }
  .points-positive { color: green; font-weight: bold; }
  .points-negative { color: red; font-weight: bold; }
</style>

<h2>Fantasy Points Leaderboard</h2>
<table>
  <tr><th>Rank</th><th>Player</th><th>Batting Pts</th><th>Bowling Pts</th><th>Fielding Pts</th><th>Total Pts</th></tr>
  {{#each fantasyPlayers}}
  <tr>
    <td>{{rank}}</td>
    <td>{{name}}</td>
    <td>{{battingPts}}</td>
    <td>{{bowlingPts}}</td>
    <td>{{fieldingPts}}</td>
    <td><strong>{{totalPts}}</strong></td>
  </tr>
  {{/each}}
</table>

<h2>Match Metadata</h2>
<table>
  <tr><th>Field</th><th>Value</th></tr>
  <tr><td>Name</td><td>{{match.name}}</td></tr>
  <tr><td>Match Type</td><td>{{match.matchType}}</td></tr>
  <tr><td>Status</td><td>{{match.status}}</td></tr>
  <tr><td>Venue</td><td>{{match.venue}}</td></tr>
  <tr><td>Date</td><td>{{match.date}}</td></tr>
  <tr><td>Teams</td><td>{{match.teams}}</td></tr>
</table>

<h2>Innings Scores</h2>
<table>
  <tr><th>Inning</th><th>Runs (R)</th><th>Wickets (W)</th><th>Overs (O)</th></tr>
  {{#each innings}}
  <tr>
    <td>{{inning}}</td>
    <td>{{r}}</td>
    <td>{{w}}</td>
    <td>{{o}}</td>
  </tr>
  {{/each}}
</table>

<h2>Top 10 Batting Performers</h2>
<table>
  <tr><th>Rank</th><th>Batsman</th><th>Inning</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th><th>SR</th></tr>
  {{#each topBatsmen}}
  <tr>
    <td>{{rank}}</td>
    <td>{{name}}</td>
    <td>{{inning}}</td>
    <td>{{runs}}</td>
    <td>{{balls}}</td>
    <td>{{fours}}</td>
    <td>{{sixes}}</td>
    <td>{{sr}}</td>
  </tr>
  {{/each}}
</table>
`;

function createPayload() {
  const response = pm.response.json();
  const data = response.data;
  
  // Match metadata
  const match = {
    name: data.name || 'N/A',
    matchType: data.matchType || 'N/A',
    status: data.status || 'N/A',
    venue: data.venue || 'N/A',
    date: data.date || 'N/A',
    teams: data.teams ? data.teams.join(' vs ') : 'N/A'
  };
  
  // Innings scores
  const innings = data.score ? data.score.map(function(s) {
    return {
      inning: s.inning || 'N/A',
      r: s.r !== undefined ? s.r : 'N/A',
      w: s.w !== undefined ? s.w : 'N/A',
      o: s.o !== undefined ? s.o : 'N/A'
    };
  }) : [];
  
  // Top batsmen
  var allBatsmen = [];
  if (data.scorecard) {
    data.scorecard.forEach(function(inningData) {
      if (inningData.batting) {
        inningData.batting.forEach(function(b) {
          allBatsmen.push({
            name: b.batsman ? b.batsman.name : 'N/A',
            inning: inningData.inning || 'N/A',
            runs: b.r || 0,
            balls: b.b || 0,
            fours: b['4s'] || 0,
            sixes: b['6s'] || 0,
            sr: b.sr || 0
          });
        });
      }
    });
  }
  allBatsmen.sort(function(a, b) { return b.runs - a.runs; });
  var topBatsmen = allBatsmen.slice(0, 10).map(function(b, i) {
    b.rank = i + 1;
    return b;
  });

  // ========== FANTASY POINTS CALCULATION ==========
  var playerStats = {}; // Aggregate by player name

  function getOrCreatePlayer(name) {
    if (!playerStats[name]) {
      playerStats[name] = {
        name: name,
        battingPts: 0,
        bowlingPts: 0,
        fieldingPts: 0
      };
    }
    return playerStats[name];
  }

  // Rules
  var rules = {
    batting: {
      runPoint: 1,
      notOut: 10,
      six: 2,
      four: 1,
      srCondition: { minRuns: 20, minBalls: 10 },
      milestones: [25, 50, 75, 100, 125, 150, 200]
    },
    bowling: {
      wicket: 25,
      extraPenalty: -2,
      ecoConditionMinOvers: 2
    },
    fielding: {
      catch: 10,
      runout: 10,
      stumping: 10
    }
  };

  // SR slabs for batting
  function getSRPoints(sr, runs, balls) {
    // Condition: runs > 20 OR balls >= 10
    if (!(runs > 20 || balls >= 10)) return 0;
    
    if (sr < 50) return -60;
    if (sr < 75) return -40;
    if (sr < 100) return -20;
    if (sr < 125) return -10;
    if (sr >= 125 && sr < 150) return 0;
    if (sr > 300) return 80;
    if (sr >= 350) return 100;
    if (sr > 250) return 60;
    if (sr > 200) return 40;
    if (sr > 175) return 20;
    if (sr > 150) return 10;
    return 0;
  }

  // Milestone bonus
  function getMilestoneBonus(runs) {
    var bonus = 0;
    var milestones = [25, 50, 75, 100, 125, 150, 200];
    for (var i = 0; i < milestones.length; i++) {
      if (runs >= milestones[i]) {
        bonus += milestones[i];
      }
    }
    return bonus;
  }

  // Economy slabs for bowling (overs > 2)
  function getEcoPoints(eco, overs) {
    if (overs <= 2) return 0;
    
    if (eco < 1) return 100;
    if (eco < 2) return 80;
    if (eco < 4) return 40;
    if (eco < 6) return 20;
    if (eco < 8) return 10;
    if (eco < 10) return 0;
    if (eco >= 16) return -60;
    if (eco >= 14) return -40;
    if (eco >= 12) return -20;
    if (eco >= 10) return -10;
    return 0;
  }

  // Process scorecard
  if (data.scorecard) {
    data.scorecard.forEach(function(inningData) {
      // Batting
      if (inningData.batting) {
        inningData.batting.forEach(function(b) {
          var playerName = b.batsman ? b.batsman.name : null;
          if (!playerName) return;
          
          var player = getOrCreatePlayer(playerName);
          var runs = b.r || 0;
          var balls = b.b || 0;
          var fours = b['4s'] || 0;
          var sixes = b['6s'] || 0;
          var sr = b.sr || 0;
          var dismissalText = b['dismissal-text'] || '';
          var isNotOut = dismissalText === 'not out';

          // Run points
          var pts = runs * rules.batting.runPoint;
          // Boundary bonus
          pts += fours * rules.batting.four;
          pts += sixes * rules.batting.six;
          // Not out bonus
          if (isNotOut) pts += rules.batting.notOut;
          // Milestone bonus
          pts += getMilestoneBonus(runs);
          // SR slab
          pts += getSRPoints(sr, runs, balls);

          player.battingPts += pts;
        });
      }

      // Bowling
      if (inningData.bowling) {
        inningData.bowling.forEach(function(bw) {
          var playerName = bw.bowler ? bw.bowler.name : null;
          if (!playerName) return;

          var player = getOrCreatePlayer(playerName);
          var wickets = bw.w || 0;
          var overs = bw.o || 0;
          var eco = bw.eco || 0;
          var wd = bw.wd || 0;
          var nb = bw.nb || 0;

          var pts = 0;
          // Wicket points
          pts += wickets * rules.bowling.wicket;
          // Economy slab (if overs > 2)
          pts += getEcoPoints(eco, overs);
          // Extras penalty
          pts += (wd + nb) * rules.bowling.extraPenalty;

          player.bowlingPts += pts;
        });
      }

      // Fielding
      if (inningData.catching) {
        inningData.catching.forEach(function(c) {
          var playerName = c.catcher ? c.catcher.name : null;
          if (!playerName) return;

          var player = getOrCreatePlayer(playerName);
          var catches = c.catch || 0;
          var stumpings = c.stumped || 0;
          var runouts = c.runout || 0;

          var pts = 0;
          pts += catches * rules.fielding.catch;
          pts += stumpings * rules.fielding.stumping;
          pts += runouts * rules.fielding.runout;

          player.fieldingPts += pts;
        });
      }
    });
  }

  // Convert to array and calculate totals
  var fantasyPlayers = [];
  for (var name in playerStats) {
    var p = playerStats[name];
    p.totalPts = p.battingPts + p.bowlingPts + p.fieldingPts;
    fantasyPlayers.push(p);
  }

  // Sort by total points descending
  fantasyPlayers.sort(function(a, b) { return b.totalPts - a.totalPts; });

  // Add rank
  fantasyPlayers = fantasyPlayers.map(function(p, i) {
    p.rank = i + 1;
    return p;
  });

  return {
    match: match,
    innings: innings,
    topBatsmen: topBatsmen,
    fantasyPlayers: fantasyPlayers
  };
}

pm.visualizer.set(template, createPayload());


//2nd version with more detailed comments and improved structure
// Visualization Script
// Visualization Script

const template2 = `
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 16px; background: #f5f5f5; }
  h2 { color: #333; font-size: 18px; margin: 20px 0 12px; border-left: 4px solid #ff6c37; padding-left: 10px; }
  .leaderboard { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .leaderboard th { background: #ff6c37; color: #fff; padding: 12px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  .leaderboard td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; font-size: 13px; }
  .leaderboard tr:hover { background: #fafafa; }
  .rank { font-weight: 700; color: #ff6c37; font-size: 14px; }
  .player-name { font-weight: 600; color: #222; }
  .pts-cell { font-family: 'Consolas', monospace; font-size: 13px; text-align: center; }
  .total-pts { font-weight: 700; color: #ff6c37; font-size: 15px; }
  
  .details-card { background: #fafafa; border-radius: 6px; padding: 8px; }
  .detail-section { margin-bottom: 8px; }
  .detail-section:last-child { margin-bottom: 0; }
  .section-header { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
  .detail-table { width: 100%; font-size: 11px; }
  .detail-table td { padding: 2px 4px; }
  .detail-label { color: #888; font-size: 10px; }
  .detail-value { font-family: 'Consolas', monospace; text-align: right; color: #333; }
  
  .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; margin-left: 3px; }
  .badge.pos { background: #d4edda; color: #155724; }
  .badge.neg { background: #f8d7da; color: #721c24; }
  .badge.zero { background: #e9ecef; color: #6c757d; }
  
  .context { color: #999; font-size: 10px; font-style: italic; }
  
  .meta-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 16px; }
  .meta-table th, .meta-table td { padding: 10px 12px; text-align: left; font-size: 12px; border-bottom: 1px solid #eee; }
  .meta-table th { background: #f8f8f8; color: #666; font-weight: 600; width: 30%; }
</style>

<h2>Fantasy Points Leaderboard</h2>
<table class="leaderboard">
  <tr><th>Rank</th><th>Player</th><th>Batting</th><th>Bowling</th><th>Fielding</th><th>Total</th><th>Details</th></tr>
  {{#each fantasyPlayers}}
  <tr>
    <td class="rank">{{rank}}</td>
    <td class="player-name">{{name}}</td>
    <td class="pts-cell">{{battingPts}}</td>
    <td class="pts-cell">{{bowlingPts}}</td>
    <td class="pts-cell">{{fieldingPts}}</td>
    <td class="pts-cell total-pts">{{totalPts}}</td>
    <td>
      <div class="details-card">
        {{#if hasBatting}}
        <div class="detail-section">
          <div class="section-header">Batting</div>
          <table class="detail-table">
            <tr><td class="detail-label">Runs</td><td class="detail-value">{{batting.runs}} <span class="context">({{batting.balls}}b)</span></td></tr>
            <tr><td class="detail-label">Run Pts</td><td class="detail-value">{{batting.runPts}}</td></tr>
            <tr><td class="detail-label">Fours</td><td class="detail-value">{{batting.fours}} <span class="context">× 1</span></td></tr>
            <tr><td class="detail-label">Sixes</td><td class="detail-value">{{batting.sixes}} <span class="context">× 2</span></td></tr>
            <tr><td class="detail-label">SR Bonus</td><td class="detail-value"><span class="badge {{batting.srClass}}">{{batting.srBonus}}</span> <span class="context">({{batting.sr}})</span></td></tr>
          </table>
        </div>
        {{/if}}
        {{#if hasBowling}}
        <div class="detail-section">
          <div class="section-header">Bowling</div>
          <table class="detail-table">
            <tr><td class="detail-label">Wickets</td><td class="detail-value">{{bowling.wickets}} <span class="context">× 25</span></td></tr>
            <tr><td class="detail-label">Overs</td><td class="detail-value">{{bowling.overs}}</td></tr>
            <tr><td class="detail-label">Econ Bonus</td><td class="detail-value"><span class="badge {{bowling.econClass}}">{{bowling.econBonus}}</span> <span class="context">({{bowling.eco}})</span></td></tr>
            <tr><td class="detail-label">Extras</td><td class="detail-value"><span class="context">wd:{{bowling.wd}} nb:{{bowling.nb}}</span></td></tr>
          </table>
        </div>
        {{/if}}
        {{#if hasFielding}}
        <div class="detail-section">
          <div class="section-header">Fielding</div>
          <table class="detail-table">
            <tr><td class="detail-label">Catches</td><td class="detail-value">{{fielding.catches}} <span class="context">× 8</span></td></tr>
            <tr><td class="detail-label">Stumpings</td><td class="detail-value">{{fielding.stumpings}} <span class="context">× 12</span></td></tr>
            <tr><td class="detail-label">Run Outs</td><td class="detail-value">{{fielding.runouts}} <span class="context">× 6</span></td></tr>
          </table>
        </div>
        {{/if}}
      </div>
    </td>
  </tr>
  {{/each}}
</table>

<h2>Match Info</h2>
<table class="meta-table">
  <tr><th>Match</th><td>{{match.name}}</td></tr>
  <tr><th>Type</th><td>{{match.matchType}}</td></tr>
  <tr><th>Status</th><td>{{match.status}}</td></tr>
  <tr><th>Venue</th><td>{{match.venue}}</td></tr>
  <tr><th>Date</th><td>{{match.date}}</td></tr>
</table>

<h2>Innings Summary</h2>
<table class="meta-table">
  <tr><th>Inning</th><th>Runs</th><th>Wickets</th><th>Overs</th></tr>
  {{#each innings}}
  <tr><td>{{inning}}</td><td>{{r}}</td><td>{{w}}</td><td>{{o}}</td></tr>
  {{/each}}
</table>
`;

function createPayload() {
  const data = pm.response.json().data;
  const playerStats = {};

  // Collect batting stats
  (data.scorecard || []).forEach(inn => {
    (inn.batting || []).forEach(b => {
      const id = b.batsman.id;
      const name = b.batsman.name;
      if (!playerStats[id]) playerStats[id] = { name, batting: null, bowling: null, fielding: null };
      const runs = b.r || 0, balls = b.b || 0, fours = b["4s"] || 0, sixes = b["6s"] || 0, sr = b.sr || 0;
      let runPts = runs;
      let boundaryPts = fours * 1 + sixes * 2;
      let srBonus = 0;
      if (balls >= 10) {
        if (sr >= 170) srBonus = 6;
        else if (sr >= 150) srBonus = 4;
        else if (sr >= 130) srBonus = 2;
        else if (sr < 70) srBonus = -6;
        else if (sr < 80) srBonus = -4;
        else if (sr < 90) srBonus = -2;
      }
      let srClass = srBonus > 0 ? 'pos' : (srBonus < 0 ? 'neg' : 'zero');
      playerStats[id].batting = { runs, balls, fours, sixes, sr: sr.toFixed(2), runPts, boundaryPts, srBonus, srClass };
    });

    // Collect bowling stats
    (inn.bowling || []).forEach(bw => {
      const id = bw.bowler.id;
      const name = bw.bowler.name;
      if (!playerStats[id]) playerStats[id] = { name, batting: null, bowling: null, fielding: null };
      const wickets = bw.w || 0, overs = bw.o || 0, eco = bw.eco || 0, wd = bw.wd || 0, nb = bw.nb || 0;
      let wicketPts = wickets * 25;
      let econBonus = 0;
      if (overs >= 2) {
        if (eco <= 5) econBonus = 6;
        else if (eco <= 6) econBonus = 4;
        else if (eco <= 7) econBonus = 2;
        else if (eco >= 12) econBonus = -6;
        else if (eco >= 11) econBonus = -4;
        else if (eco >= 10) econBonus = -2;
      }
      let econClass = econBonus > 0 ? 'pos' : (econBonus < 0 ? 'neg' : 'zero');
      playerStats[id].bowling = { wickets, overs, eco: eco.toFixed(2), wd, nb, wicketPts, econBonus, econClass };
    });

    // Collect fielding stats
    (inn.catching || []).forEach(c => {
      if (!c.catcher || !c.catcher.id) return;
      const id = c.catcher.id;
      const name = c.catcher.name;
      if (!playerStats[id]) playerStats[id] = { name, batting: null, bowling: null, fielding: null };
      const catches = c.catch || 0, stumpings = c.stumped || 0, runouts = c.runout || 0;
      if (!playerStats[id].fielding) playerStats[id].fielding = { catches: 0, stumpings: 0, runouts: 0 };
      playerStats[id].fielding.catches += catches;
      playerStats[id].fielding.stumpings += stumpings;
      playerStats[id].fielding.runouts += runouts;
    });
  });

  // Calculate totals and build array
  let players = Object.keys(playerStats).map(id => {
    const p = playerStats[id];
    let battingPts = 0, bowlingPts = 0, fieldingPts = 0;
    if (p.batting) {
      battingPts = p.batting.runPts + p.batting.boundaryPts + p.batting.srBonus;
    }
    if (p.bowling) {
      bowlingPts = p.bowling.wicketPts + p.bowling.econBonus;
    }
    if (p.fielding) {
      fieldingPts = p.fielding.catches * 8 + p.fielding.stumpings * 12 + p.fielding.runouts * 6;
    }
    return {
      name: p.name,
      battingPts,
      bowlingPts,
      fieldingPts,
      totalPts: battingPts + bowlingPts + fieldingPts,
      hasBatting: !!p.batting,
      hasBowling: !!p.bowling,
      hasFielding: !!(p.fielding && (p.fielding.catches || p.fielding.stumpings || p.fielding.runouts)),
      batting: p.batting || {},
      bowling: p.bowling || {},
      fielding: p.fielding || { catches: 0, stumpings: 0, runouts: 0 }
    };
  });

  players.sort((a, b) => b.totalPts - a.totalPts);
  players = players.map((p, i) => ({ ...p, rank: i + 1 }));

  const innings = (data.score || []).map(s => ({ inning: s.inning, r: s.r, w: s.w, o: s.o }));

  return {
    fantasyPlayers: players,
    match: {
      name: data.name || '',
      matchType: data.matchType || '',
      status: data.status || '',
      venue: data.venue || '',
      date: data.date || ''
    },
    innings
  };
}

pm.visualizer.set(template, createPayload());
