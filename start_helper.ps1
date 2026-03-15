$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$npm = "C:\Program Files\nodejs\npm.cmd"

Start-Process -FilePath $npm -ArgumentList "run","dev" `
  -WorkingDirectory "$root\backend" -WindowStyle Hidden

Start-Process -FilePath $npm -ArgumentList "run","dev" `
  -WorkingDirectory "$root\frontend" -WindowStyle Hidden

$timeout = 30  # 最多等 30 秒
$elapsed = 0
while ($elapsed -lt $timeout) {
    $backend  = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
    $frontend = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($backend -and $frontend) { break }
    Start-Sleep -Milliseconds 500
    $elapsed += 0.5
}
Start-Process "http://localhost:3000"
