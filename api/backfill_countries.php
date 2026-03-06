<?php
require 'db.php';

// This script fetches the full CricAPI players list (paginated) and maps names -> country,
// then updates `players` rows in DB where country is empty.
// Usage: invoke from browser or CLI: http://localhost/cricket26_v2/api/backfill_countries.php

set_time_limit(0);
$apikey = isset($_GET['apikey']) ? $_GET['apikey'] : null;
if(!$apikey) { http_response_code(400); echo json_encode(['status'=>'failure','reason'=>'apikey required as query param']); exit; }

// ensure column exists
try{
  $pdo->exec("ALTER TABLE players ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT NULL");
} catch(Exception $e){ /* ignore if not supported */ }

// fetch players list pages
$playersMap = []; // norm(name) => country
$pageSize = 1000;
$offset = 0;
$maxIterations = 100; // safety
for($i=0;$i<$maxIterations;$i++){
  $url = "https://api.cricapi.com/v1/players?apikey=".urlencode($apikey)."&offset=".intval($offset);
  $ctx = stream_context_create(['http'=>['timeout'=>10]]);
  $txt = @file_get_contents($url, false, $ctx);
  if(!$txt) break;
  $j = json_decode($txt, true);
  if(!$j || !isset($j['data']) || !is_array($j['data']) || count($j['data'])==0) break;
  foreach($j['data'] as $p){
    if(!isset($p['name'])) continue;
    $name = trim($p['name']);
    $country = '';
    if(isset($p['country'])) $country = $p['country'];
    elseif(isset($p['country_name'])) $country = $p['country_name'];
    if($country === null) $country = '';
    $key = preg_replace('/[^a-z]/','',strtolower($name));
    if($key) $playersMap[$key] = $country;
  }
  if(count($j['data']) < $pageSize) break;
  $offset += $pageSize;
}

// Now update DB players where country is null or empty
$stmt = $pdo->query('SELECT id, name, team_id FROM players');
$all = $stmt->fetchAll();
$updated = 0;
$notfound = [];
$updateStmt = $pdo->prepare('UPDATE players SET country = ? WHERE id = ?');
foreach($all as $row){
  $name = trim($row['name']);
  $key = preg_replace('/[^a-z]/','',strtolower($name));
  $country = '';
  if($key && isset($playersMap[$key])) $country = $playersMap[$key];
  if(!$country){ $notfound[] = $name; continue; }
  $updateStmt->execute([$country, $row['id']]);
  $updated++;
}

echo json_encode(['status'=>'success','fetchedPlayers'=>count($playersMap),'updated'=>$updated,'notFoundCount'=>count($notfound),'notFoundSample'=>array_slice($notfound,0,10)]);
