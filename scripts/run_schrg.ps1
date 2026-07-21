$Sql = Get-Content -Raw .\public\schrg.sql
$Body = @{ sql = $Sql } | ConvertTo-Json -Depth 10
try {
  $resp = Invoke-RestMethod -Uri 'http://localhost:3001/api/rule-result/schrg' -Method Post -Body $Body -ContentType 'application/json'
  $resp | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 .\server_schrg_response.json
  Write-Output 'OK: response saved to server_schrg_response.json'
} catch {
  $_ | Out-String | Out-File -Encoding utf8 .\server_schrg_response.json
  Write-Output 'ERROR: response saved to server_schrg_response.json'
  exit 1
}
