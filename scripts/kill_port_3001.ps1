$pids = @(Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess) | Sort-Object -Unique
if ($pids.Count -gt 0) {
  foreach ($kpid in $pids) {
    try {
      Stop-Process -Id $kpid -Force -ErrorAction Stop
      Write-Output "Stopped PID $kpid"
    } catch {
      $errMsg = $_.Exception.Message
      Write-Warning ("Failed to stop PID {0}: {1}" -f $kpid, $errMsg)
    }
  }
} else {
  $lines = netstat -aon | Select-String ':3001'
  if ($lines) {
    foreach ($l in $lines) {
      $parts = $l -split '\\s+'
      $kpid = $parts[-1]
      try {
        Stop-Process -Id $kpid -Force -ErrorAction Stop
        Write-Output "Stopped PID $kpid"
      } catch {
        $errMsg = $_.Exception.Message
        Write-Warning ("Failed to stop PID {0}: {1}" -f $kpid, $errMsg)
      }
    }
  } else {
    Write-Output 'No process found on port 3001'
  }
}
