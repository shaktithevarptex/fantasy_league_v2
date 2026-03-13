<?php
require_once "config.php";

$url = $_GET["url"];

if(!$url){
    echo json_encode(["error"=>"missing url"]);
    exit;
}

$final = $url . (str_contains($url,'?') ? '&' : '?') . "apikey=" . CRIC_API_KEY;

$response = file_get_contents($final);

echo $response;