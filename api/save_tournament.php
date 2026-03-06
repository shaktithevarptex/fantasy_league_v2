<?php
require 'db.php';

$body = json_decode(file_get_contents('php://input'), true);
if(!$body){ http_response_code(400); echo json_encode(['status'=>'failure','reason'=>'Invalid JSON']); exit; }

try{
  $pdo->beginTransaction();
  $stmt = $pdo->prepare('INSERT INTO tournaments (name, series_id, status, start_date, created_at) VALUES (?,?,?,?,?)');
  $start = $body['startDate'] ?? date('Y-m-d');
  $stmt->execute([$body['name'],$body['seriesId'] ?? null,$body['status'] ?? 'active',$start,time()]);
  $tId = $pdo->lastInsertId();

  foreach($body['teams'] as $team){
    $stmt = $pdo->prepare('INSERT INTO teams (tournament_id, name, owner, players_count) VALUES (?,?,?,?)');
    $stmt->execute([$tId,$team['name'],$team['owner'] ?? $team['name'], count($team['players'] ?? [])]);
    $teamId = $pdo->lastInsertId();
    foreach($team['players'] as $p){
      $stmt = $pdo->prepare('INSERT INTO players (team_id, name, original_name, price, total_points, batting_points, bowling_points, fielding_points, match_points, is_injured) VALUES (?,?,?,?,?,?,?,?,?,?)');
      $mp = isset($p['matchPoints']) ? json_encode($p['matchPoints']) : json_encode(new stdClass());
      $stmt->execute([$teamId,$p['name'],$p['originalName'] ?? $p['name'],$p['price'] ?? 0,$p['totalPoints'] ?? 0,$p['battingPoints'] ?? 0,$p['bowlingPoints'] ?? 0,$p['fieldingPoints'] ?? 0,$mp,isset($p['isInjured'])?($p['isInjured']?1:0):0]);
    }
  }
  $pdo->commit();
  echo json_encode(['status'=>'success','id'=>$tId]);
} catch(Exception $e){
  $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status'=>'failure','reason'=>$e->getMessage()]);
}
