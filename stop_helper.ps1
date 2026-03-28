$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPattern = [regex]::Escape((Join-Path $root 'backend'))
$frontendPattern = [regex]::Escape((Join-Path $root 'frontend'))

Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue |
    ForEach-Object {
        try {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop
        } catch {
        }
    }

Get-CimInstance Win32_Process |
    Where-Object {
        ($_.Name -eq 'node.exe' -and ($_.CommandLine -match $backendPattern -or $_.CommandLine -match $frontendPattern)) -or
        ($_.Name -eq 'powershell.exe' -and ($_.CommandLine -match 'YudoList Backend' -or $_.CommandLine -match 'YudoList Frontend'))
    } |
    ForEach-Object {
        try {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
        } catch {
        }
    }

Write-Host 'Project stopped'
Start-Sleep -Seconds 2
