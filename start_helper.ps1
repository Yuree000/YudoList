$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$backendEnv = Join-Path $backendDir '.env'
$backendEnvExample = Join-Path $backendDir '.env.example'
$backendStdoutLog = Join-Path $backendDir 'start.stdout.log'
$backendStderrLog = Join-Path $backendDir 'start.stderr.log'
$frontendStdoutLog = Join-Path $frontendDir 'start.stdout.log'
$frontendStderrLog = Join-Path $frontendDir 'start.stderr.log'
$frontendUrl = 'http://localhost:3000'
$backendHealthUrl = 'http://localhost:3001/health'
$backendDirPattern = [regex]::Escape($backendDir)
$frontendDirPattern = [regex]::Escape($frontendDir)

function Get-NpmCommand {
    $candidate = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $npmCommand = if ($candidate) { $candidate.Source } else { $null }
    if (-not $npmCommand) {
        $candidate = Get-Command npm -ErrorAction SilentlyContinue
        $npmCommand = if ($candidate) { $candidate.Source } else { $null }
    }

    if (-not $npmCommand) {
        throw 'Node.js and npm are required. Install Node.js first.'
    }

    return $npmCommand
}

function Test-HttpReady([string]$Url) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Invoke-NpmStep([string]$WorkingDirectory, [string[]]$Arguments, [string]$Label) {
    Write-Host "==> $Label"
    Push-Location $WorkingDirectory
    try {
        & $script:npm @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed: npm $($Arguments -join ' ')"
        }
    } finally {
        Pop-Location
    }
}

function Ensure-BackendEnv {
    if (Test-Path $backendEnv) {
        return
    }

    if (-not (Test-Path $backendEnvExample)) {
        throw 'backend/.env.example is missing, cannot create backend/.env'
    }

    Copy-Item $backendEnvExample $backendEnv
    Write-Host '==> Created backend/.env from backend/.env.example'
}

function Ensure-Dependencies([string]$WorkingDirectory, [string]$Name) {
    $nodeModules = Join-Path $WorkingDirectory 'node_modules'
    if (Test-Path $nodeModules) {
        return
    }

    Invoke-NpmStep $WorkingDirectory @('install') "Installing $Name dependencies"
}

function Stop-ProjectProcesses {
    $processes = Get-CimInstance Win32_Process | Where-Object {
        $_.ProcessId -ne $PID -and (
            ($_.Name -eq 'node.exe' -and ($_.CommandLine -match $backendDirPattern -or $_.CommandLine -match $frontendDirPattern)) -or
            ($_.Name -eq 'powershell.exe' -and ($_.CommandLine -match 'YudoList Backend' -or $_.CommandLine -match 'YudoList Frontend'))
        )
    }

    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        } catch {
        }
    }
}

function Start-BackgroundDevServer(
    [string]$WorkingDirectory,
    [string]$Title,
    [string]$StdoutLog,
    [string]$StderrLog
) {
    $escapedDir = $WorkingDirectory.Replace("'", "''")
    $escapedNpm = $script:npm.Replace("'", "''")
    $escapedStdout = $StdoutLog.Replace("'", "''")
    $escapedStderr = $StderrLog.Replace("'", "''")
    $escapedTitle = $Title.Replace("'", "''")

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    foreach ($logPath in @($StdoutLog, $StderrLog)) {
        try {
            Add-Content -Path $logPath -Value "`r`n=== $timestamp $Title ==="
        } catch {
        }
    }

    $command = "& { " +
        "`$Host.UI.RawUI.WindowTitle = '$escapedTitle'; " +
        "Set-Location -LiteralPath '$escapedDir'; " +
        "& '$escapedNpm' run dev 1>> '$escapedStdout' 2>> '$escapedStderr' }"

    return Start-Process `
        -FilePath 'powershell.exe' `
        -ArgumentList '-ExecutionPolicy', 'Bypass', '-Command', $command `
        -WindowStyle Hidden `
        -PassThru
}

function Show-LogTail([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path)) {
        return
    }

    Write-Host ''
    Write-Host "--- $Label ---"
    Get-Content $Path -Tail 40
}

$npm = Get-NpmCommand
$script:npm = $npm

$frontendAlreadyRunning = Test-HttpReady $frontendUrl
$backendAlreadyRunning = Test-HttpReady $backendHealthUrl

if ($frontendAlreadyRunning -and $backendAlreadyRunning) {
    Write-Host '==> Frontend and backend are already running'
    Start-Process $frontendUrl
    exit 0
}

if ($frontendAlreadyRunning -or $backendAlreadyRunning) {
    Write-Host '==> Cleaning partial startup state'
    Stop-ProjectProcesses
    Start-Sleep -Seconds 2
    $frontendAlreadyRunning = $false
    $backendAlreadyRunning = $false
}

Write-Host '==> Preparing YudoList workspace'
Ensure-BackendEnv
Ensure-Dependencies $backendDir 'backend'
Ensure-Dependencies $frontendDir 'frontend'
Invoke-NpmStep $backendDir @('run', 'db:generate') 'Generating Prisma client'
Invoke-NpmStep $backendDir @('run', 'db:push') 'Pushing database schema'
Stop-ProjectProcesses
Start-Sleep -Seconds 1

$backendShell = $null
$frontendShell = $null

if (-not $backendAlreadyRunning) {
    Write-Host '==> Starting backend dev server'
    $backendShell = Start-BackgroundDevServer `
        $backendDir `
        'YudoList Backend' `
        $backendStdoutLog `
        $backendStderrLog
} else {
    Write-Host '==> Backend is already running'
}

if (-not $frontendAlreadyRunning) {
    Write-Host '==> Starting frontend dev server'
    $frontendShell = Start-BackgroundDevServer `
        $frontendDir `
        'YudoList Frontend' `
        $frontendStdoutLog `
        $frontendStderrLog
} else {
    Write-Host '==> Frontend is already running'
}

$deadline = (Get-Date).AddMinutes(2)
$backendReady = $backendAlreadyRunning
$frontendReady = $frontendAlreadyRunning

while ((Get-Date) -lt $deadline) {
    if (-not $backendReady) {
        $backendReady = Test-HttpReady $backendHealthUrl
    }

    if (-not $frontendReady) {
        $frontendReady = Test-HttpReady $frontendUrl
    }

    if ($backendReady -and $frontendReady) {
        break
    }

    $backendExited = $backendShell -and $backendShell.HasExited
    $frontendExited = $frontendShell -and $frontendShell.HasExited

    if ($backendExited -or $frontendExited) {
        break
    }

    Start-Sleep -Seconds 1
}

if ($backendReady -and $frontendReady) {
    Write-Host "==> YudoList is ready at $frontendUrl"
    Start-Process $frontendUrl
    exit 0
}

Write-Host '==> Startup did not finish successfully'
if (-not $backendReady) {
    Write-Host "Backend health check failed: $backendHealthUrl"
}
if (-not $frontendReady) {
    Write-Host "Frontend did not respond: $frontendUrl"
}

Write-Host ''
Write-Host 'The dev servers were started in the background.'
Show-LogTail $backendStdoutLog 'backend stdout'
Show-LogTail $backendStderrLog 'backend stderr'
Show-LogTail $frontendStdoutLog 'frontend stdout'
Show-LogTail $frontendStderrLog 'frontend stderr'
Write-Host ''
Write-Host 'Check the logs above, then run stop.bat and try again.'
pause
exit 1
