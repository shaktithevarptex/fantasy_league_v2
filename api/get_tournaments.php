<?php
require 'db.php';

try{
  $stmt = $pdo->query('SELECT * FROM tournaments ORDER BY id DESC');
  $tournaments = $stmt->fetchAll();
  foreach($tournaments as &$t){
    $stmt2 = $pdo->prepare('SELECT * FROM teams WHERE tournament_id = ?');
    $stmt2->execute([$t['id']]);
    $teams = $stmt2->fetchAll();
    foreach($teams as &$tm){
      $stmt3 = $pdo->prepare('SELECT * FROM players WHERE team_id = ?');
      $stmt3->execute([$tm['id']]);
      $tm_players = $stmt3->fetchAll();
      // decode JSON match_points if present and convert snake_case to camelCase
      foreach($tm_players as &$p){
        // match_points -> matchPoints
        if(isset($p['match_points']) && $p['match_points'] !== null){
          $p['matchPoints'] = json_decode($p['match_points'], true);
        } else {
          $p['matchPoints'] = new stdClass();
        }
        unset($p['match_points']);

        // numeric/points fields: convert to camelCase names expected by frontend
        $p['totalPoints'] = isset($p['total_points']) ? (int)$p['total_points'] : (isset($p['totalPoints']) ? (int)$p['totalPoints'] : 0);
        unset($p['total_points']);

        $p['battingPoints'] = isset($p['batting_points']) ? (int)$p['batting_points'] : (isset($p['battingPoints']) ? (int)$p['battingPoints'] : 0);
        unset($p['batting_points']);

        $p['bowlingPoints'] = isset($p['bowling_points']) ? (int)$p['bowling_points'] : (isset($p['bowlingPoints']) ? (int)$p['bowlingPoints'] : 0);
        unset($p['bowling_points']);

        $p['fieldingPoints'] = isset($p['fielding_points']) ? (int)$p['fielding_points'] : (isset($p['fieldingPoints']) ? (int)$p['fieldingPoints'] : 0);
        unset($p['fielding_points']);

        $p['price'] = isset($p['price']) ? $p['price'] : (isset($p['price']) ? $p['price'] : 0);

        $p['isInjured'] = isset($p['is_injured']) ? (bool)$p['is_injured'] : (isset($p['isInjured']) ? (bool)$p['isInjured'] : false);
        unset($p['is_injured']);

        // ensure id is string for frontend expectations
        if(isset($p['id'])) $p['id'] = (string)$p['id'];

        // include country if present
        $p['country'] = isset($p['country']) ? $p['country'] : '';
      }
      $tm['players'] = $tm_players;
    }
    $t['teams'] = $teams;
  }
  echo json_encode(['status'=>'success','data'=>$tournaments]);
} catch(Exception $e){
  http_response_code(500);
  echo json_encode(['status'=>'failure','reason'=>$e->getMessage()]);
}
