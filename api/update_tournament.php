<?php
require 'db.php';
$body = json_decode(file_get_contents('php://input'), true);
if(!$body || !isset($body['id'])){ http_response_code(400); echo json_encode(['status'=>'failure','reason'=>'Missing id']); exit; }
try{
  $pdo->beginTransaction();
  // update tournaments table
  $stmt = $pdo->prepare('UPDATE tournaments SET name=?, series_id=?, status=?, start_date=? WHERE id=?');
  $stmt->execute([$body['name'],$body['seriesId'] ?? null,$body['status'] ?? 'active',$body['startDate'] ?? date('Y-m-d'), $body['id']]);

  // for simplicity delete teams+players and re-insert
  $stmt = $pdo->prepare('SELECT id FROM teams WHERE tournament_id=?');
  $stmt->execute([$body['id']]);
  $teams = $stmt->fetchAll();
  foreach($teams as $tm){
    $pdo->prepare('DELETE FROM players WHERE team_id=?')->execute([$tm['id']]);
  }
  $pdo->prepare('DELETE FROM teams WHERE tournament_id=?')->execute([$body['id']]);

  // insert new teams
  foreach($body['teams'] as $team){
    $stmt = $pdo->prepare('INSERT INTO teams (tournament_id, name, owner, players_count) VALUES (?,?,?,?)');
    $stmt->execute([$body['id'],$team['name'],$team['owner'] ?? $team['name'], count($team['players'] ?? [])]);
    $teamId = $pdo->lastInsertId();
    foreach($team['players'] as $p){
      $stmt = $pdo->prepare('INSERT INTO players (team_id, name, original_name, price, total_points, batting_points, bowling_points, fielding_points, match_points, is_injured) VALUES (?,?,?,?,?,?,?,?,?,?)');
      $mp = isset($p['matchPoints']) ? json_encode($p['matchPoints']) : json_encode(new stdClass());
      $stmt->execute([$teamId,$p['name'],$p['originalName'] ?? $p['name'],$p['price'] ?? 0,$p['totalPoints'] ?? 0,$p['battingPoints'] ?? 0,$p['bowlingPoints'] ?? 0,$p['fieldingPoints'] ?? 0,$mp,isset($p['isInjured'])?($p['isInjured']?1:0):0]);
    }
  }
  // handle matches: delete existing matches for tournament, re-insert incoming matches
  if(isset($body['matches']) && is_array($body['matches'])){
    $pdo->prepare('DELETE FROM matches WHERE tournament_id = ?')->execute([$body['id']]);
    $stmtM = $pdo->prepare('INSERT INTO matches (tournament_id, external_id, name, date, venue, status, result, team_info, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    foreach($body['matches'] as $m){
      $teamInfoJson = isset($m['teamInfo']) ? json_encode($m['teamInfo']) : null;
      $date = isset($m['date']) ? $m['date'] : null;
      $stmtM->execute([$body['id'], $m['id'] ?? null, $m['name'] ?? null, $date, $m['venue'] ?? null, $m['status'] ?? null, $m['result'] ?? null, $teamInfoJson, time()]);
    }
  }
  $pdo->commit();
  echo json_encode(['status'=>'success']);
} catch(Exception $e){ $pdo->rollBack(); http_response_code(500); echo json_encode(['status'=>'failure','reason'=>$e->getMessage()]); }
