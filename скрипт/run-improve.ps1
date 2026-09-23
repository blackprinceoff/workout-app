# run-improve.ps1 - supervisor for autonomous FitQuest improvement loop
# Runs the `improver` agent repeatedly, continuing the SAME opencode session,
# until the wall-clock timer expires. Prints progress between iterations.
#
# Usage:  .\script\run-improve.ps1 -Minutes 60            (inside project)
#         .\script\run-improve.ps1 -Minutes 90 -IterMinutes 10
#
# Requires: opencode in PATH, agent `.opencode/agents/improver.md`, AUTO_IMPROVE.md
param(
    [int]$Minutes = 60,
    [int]$IterMinutes = 8,
    [string]$Project = (Get-Location).Path,
    [string]$Agent = 'improver',
    [string]$SessionId = ''
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
    Write-Host 'ERROR: opencode not found in PATH.' -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $Project 'AUTO_IMPROVE.md'))) {
    Write-Host "ERROR: AUTO_IMPROVE.md not found in $Project" -ForegroundColor Red
    exit 1
}

$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$deadline = $sw.Elapsed + [TimeSpan]::FromMinutes($Minutes)
$started = $sw.Elapsed.TotalSeconds
$iterCount = 0
$usedSession = $SessionId

Write-Host "FitQuest auto-improve: project=$Project minutes=$Minutes iterMinutes=$IterMinutes agent=$Agent" -ForegroundColor Cyan

function Invoke-Run([string]$Msg, [bool]$Final) {
    $script:iterCount++
    $stamp = Get-Date -Format 'HHmmss'
    $logPath = Join-Path $logDir "iter-$($script:iterCount)-$stamp.log"
    $errPath = Join-Path $logDir "iter-$($script:iterCount)-$stamp.err.log"

    $argsList = @('run', '--agent', $Agent, '--auto')
    if ($script:iterCount -gt 1) {
        if ($script:usedSession) { $argsList += @('--session', $script:usedSession) }
        else { $argsList += '--continue' }
    }
    $argsList += ('"' + $Msg.Replace('"', '""') + '"')

    $tag = if ($Final) { 'FINAL' } else { 'iter' }
    Write-Host ("[{0}] {1}: launching opencode..." -f $script:iterCount, $tag) -ForegroundColor Yellow

    $p = Start-Process -FilePath 'opencode' -ArgumentList $argsList `
        -WorkingDirectory $Project -WindowStyle Hidden `
        -RedirectStandardOutput $logPath -RedirectStandardError $errPath -PassThru

    $budgetMs = [int]([TimeSpan]::FromMinutes($IterMinutes).TotalMilliseconds)
    $remainingMs = [int](($deadline - $sw.Elapsed).TotalMilliseconds)
    if ($budgetMs -gt $remainingMs) { $budgetMs = $remainingMs }
    if ($budgetMs -lt 1000) { $budgetMs = 1000 }

    if (-not $p.WaitForExit($budgetMs)) {
        Write-Host ("  timeout after {0} min, killing process." -f $IterMinutes) -ForegroundColor Magenta
        $p.Kill(); $p.WaitForExit()
    }

    if ($script:iterCount -eq 1 -and -not $script:usedSession) {
        try {
            $sess = & opencode session list -n 1 --format json 2>$null | ConvertFrom-Json
            if ($sess -is [array]) { $sess = $sess[0] }
            if ($sess.id) { $script:usedSession = [string]$sess.id }
        } catch { $script:usedSession = '' }
        if ($script:usedSession) {
            Write-Host ("  resumed session: {0}" -f $script:usedSession) -ForegroundColor DarkGray
        }
    }

    Write-Host ("  elapsed: {0} min / {1}" -f [math]::Round($sw.Elapsed.TotalMinutes, 1), $Minutes)
    if (Test-Path $logPath) {
        (Get-Content $logPath -Tail 12 -ErrorAction SilentlyContinue) | ForEach-Object {
            Write-Host ("    | " + $_) -ForegroundColor DarkGray
        }
    }
    if ((Test-Path $errPath) -and (Get-Item $errPath).Length -gt 0) {
        (Get-Content $errPath -Tail 3 -ErrorAction SilentlyContinue) | ForEach-Object {
            Write-Host ("    E| " + $_) -ForegroundColor DarkRed
        }
    }

    return ($sw.Elapsed.TotalSeconds -lt $deadline.TotalSeconds)
}

do {
    $remainingSec = ($deadline - $sw.Elapsed).TotalSeconds
    $isFinal = $remainingSec -le ([TimeSpan]::FromMinutes($IterMinutes).TotalSeconds)

    if ($isFinal) {
        $msg = "FINAL ITERATION - almost out of time. Finish the current improvement to a GREEN state (npm run test / lint / build), make the final commit, update AUTO_IMPROVE.md with the session summary and stop. Do not start new large tasks."
    } else {
        $msg = "Autonomous iteration $($iterCount + 1). Read AUTO_IMPROVE.md and continue the improvement cycle: implement the next improvement, run checks (npm run test && npm run lint && npm run build), commit, update the journal, then find another improvement."
    }

    $keepGoing = Invoke-Run -Msg $msg -Final $isFinal
} while ($keepGoing -and $sw.Elapsed -lt $deadline)

$sw.Stop()
$totMin = [math]::Round($sw.Elapsed.TotalMinutes, 1)
$realIter = $iterCount
Write-Host "" 
Write-Host "DONE: $totMin min, $realIter iterations. Summary in AUTO_IMPROVE.md and git log." -ForegroundColor Green