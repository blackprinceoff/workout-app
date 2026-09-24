# run-improve.ps1 - supervisor for autonomous FitQuest improvement loop
# Runs the `improver` agent repeatedly, continuing the SAME opencode session,
# until the wall-clock timer expires. Prints progress between iterations.
#
# Usage:  .\скрипт\run-improve.ps1 -Minutes 60            (inside project)
#         .\скрипт\run-improve.ps1 -Minutes 120 -IterMinutes 10
#         .\скрипт\run-improve.ps1 -Minutes 360 -IterMinutes 20 -Rpm 35
#
# Throttling (default ON): the script runs a small local proxy (proxy-throttle.cjs)
# that paces requests to the upstream LLM API at <=$Rpm per minute, so free-tier
# limits (e.g. NVIDIA 40 rpm) are never exceeded. Use -NoThrottle to disable.
#
# Requires: opencode in PATH, agent `.opencode/agents/improver.md`, AUTO_IMPROVE.md
param(
    [int]$Minutes = 60,
    [int]$IterMinutes = 8,
    [string]$Project = (Get-Location).Path,
    [string]$Agent = 'improver',
    [string]$SessionId = '',
    [string]$Model = 'nvidia-throttled/deepseek-ai/deepseek-v4.1-flash',
    [int]$Rpm = 35,
    [int]$Port = 4040,
    [string]$ThrottleUpstream = 'https://integrate.api.nvidia.com/v1',
    [switch]$NoThrottle
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

$cmd = Get-Command opencode.cmd -ErrorAction SilentlyContinue
if (-not $cmd) { $cmd = Get-Command opencode.ps1 -ErrorAction SilentlyContinue }
if (-not $cmd) { $cmd = Get-Command opencode -ErrorAction SilentlyContinue }
$opencodeExe = Join-Path (Split-Path $cmd.Source -Parent) 'node_modules\opencode-ai\bin\opencode.exe'
if (-not (Test-Path $opencodeExe)) { $opencodeExe = $cmd.Source }

$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$script:proxyProc = $null

function Start-ThrottleProxy {
    if ($NoThrottle) {
        Write-Host 'Throttle proxy: disabled (-NoThrottle). Running at full rate.' -ForegroundColor DarkYellow
        return
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host 'ERROR: node not found in PATH (needed for the throttle proxy).' -ForegroundColor Red
        exit 1
    }
    $healthUrl = "http://127.0.0.1:$Port/health"
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Host "Throttle proxy already running on :$Port - reusing it." -ForegroundColor Cyan
            return
        }
    } catch {}

    $proxyJs = Join-Path $PSScriptRoot 'proxy-throttle.cjs'
    if (-not (Test-Path $proxyJs)) {
        Write-Host "ERROR: $proxyJs not found." -ForegroundColor Red
        exit 1
    }
    $nodeExe = (Get-Command node).Source
    $outLog = Join-Path $logDir 'proxy-throttle.out.log'
    $errLog = Join-Path $logDir 'proxy-throttle.err.log'
    $p = Start-Process -FilePath $nodeExe -ArgumentList @($proxyJs, '--port', "$Port", '--rpm', "$Rpm", '--upstream', $ThrottleUpstream) `
        -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
    $script:proxyProc = $p

    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($resp.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) {
        Write-Host "ERROR: throttle proxy did not become ready on :$Port." -ForegroundColor Red
        if (Test-Path $errLog) {
            (Get-Content $errLog -Tail 5 -ErrorAction SilentlyContinue) | ForEach-Object {
                Write-Host ("    P| " + $_) -ForegroundColor DarkRed
            }
        }
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        exit 1
    }
    Write-Host ("Throttle proxy up on 127.0.0.1:{0} ({1} rpm, ~{2} ms interval). Model: {3}" -f $Port, $Rpm, [int](60000 / $Rpm), $Model) -ForegroundColor Cyan
}

Start-ThrottleProxy

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$deadline = $sw.Elapsed + [TimeSpan]::FromMinutes($Minutes)
$iterCount = 0
$usedSession = $SessionId
$script:stoppedNoop = $false

$modelLabel = if ($NoThrottle) { "$Agent (default model)" } else { $Model }
Write-Host "FitQuest auto-improve: project=$Project minutes=$Minutes iterMinutes=$IterMinutes agent=$Agent model=$modelLabel" -ForegroundColor Cyan

function Invoke-Run([string]$Msg, [bool]$Final) {
    $script:iterCount++
    $stamp = Get-Date -Format 'HHmmss'
    $logPath = Join-Path $logDir "iter-$($script:iterCount)-$stamp.log"
    $errPath = Join-Path $logDir "iter-$($script:iterCount)-$stamp.err.log"

    $argsList = @('run', '--agent', $Agent, '--auto')
    if (-not $NoThrottle) { $argsList += @('--model', $Model) }
    if ($script:iterCount -gt 1) {
        if ($script:usedSession) { $argsList += @('--session', $script:usedSession) }
        else { $argsList += '--continue' }
    }
    $argsList += ('"' + $Msg.Replace('"', '""') + '"')

    $tag = if ($Final) { 'FINAL' } else { 'iter' }
    Write-Host ("[{0}] {1}: launching opencode..." -f $script:iterCount, $tag) -ForegroundColor Yellow

    if (Get-Command git -ErrorAction SilentlyContinue) {
        $ec = 0
        $dirty = @(& git -C $Project status --porcelain --untracked-files=no 2>&1)
        $ec = $LASTEXITCODE
        if ($ec -eq 0 -and $dirty.Count -gt 0) {
            $local:ErrorActionPreference = 'Continue'
            & git -C $Project stash push -m "improver: dirty before iteration $($script:iterCount)" 2>&1 | Out-Null
            Write-Host ("  dirty tree (tracked changes x{0}) stashed so the run starts clean." -f $dirty.Count) -ForegroundColor Yellow
        }
    }

    $p = Start-Process -FilePath $opencodeExe -ArgumentList $argsList `
        -WorkingDirectory $Project -WindowStyle Hidden `
        -RedirectStandardOutput $logPath -RedirectStandardError $errPath -PassThru

    $procSw = [System.Diagnostics.Stopwatch]::StartNew()
    $budgetMs = [int]([TimeSpan]::FromMinutes($IterMinutes).TotalMilliseconds)
    $remainingMs = [int](($deadline - $sw.Elapsed).TotalMilliseconds)
    if ($budgetMs -gt $remainingMs) { $budgetMs = $remainingMs }
    if ($budgetMs -lt 1000) { $budgetMs = 1000 }

    $wasKilled = -not $p.WaitForExit($budgetMs)
    if ($wasKilled) {
        Write-Host ("  timeout after {0} min, killing process." -f $IterMinutes) -ForegroundColor Magenta
        $p.Kill(); $p.WaitForExit()
    }
    $procSw.Stop()

    if ($script:iterCount -eq 1 -and -not $script:usedSession) {
        try {
            $sess = & $opencodeExe session list -n 1 --format json 2>$null | ConvertFrom-Json
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

    if (-not $wasKilled -and $procSw.ElapsedMilliseconds -lt 15000) {
        $bytes = 0
        if (Test-Path $logPath) { $bytes += (Get-Item $logPath).Length }
        if (Test-Path $errPath) { $bytes += (Get-Item $errPath).Length }
        if ($bytes -lt 200) {
            $script:stoppedNoop = $true
            Write-Host ("  !! iteration exited instantly with no output ({0} bytes, exit={1})." -f $bytes, $p.ExitCode) -ForegroundColor Red
            Write-Host "  Provider/model likely unavailable (free-tier quota, 429, or wrong key). Stopping instead of burning the deadline." -ForegroundColor Red
            return $false
        }
    }

    return ($sw.Elapsed.TotalSeconds -lt $deadline.TotalSeconds)
}

try {
    do {
        $remainingSec = ($deadline - $sw.Elapsed).TotalSeconds
        $isFinal = $remainingSec -le ([TimeSpan]::FromMinutes($IterMinutes).TotalSeconds)

        if ($isFinal) {
            $msg = "FINAL ITERATION - almost out of time. Finish the current improvement to a GREEN state (npm run test / lint / build), make the final commit and push, update AUTO_IMPROVE.md with the session summary and stop. Do not start new large tasks."
        } elseif ($iterCount -eq 0) {
            $msg = "First pass - take a BROAD look at the whole project first: README, NOTES.md, GAME_DESIGN.md, AUTO_IMPROVE.md, the code under src/ and tests/. Understand what already works. Then pick the first most valuable quick improvement from the AUTO_IMPROVE.md queue (or find new ones), implement ONE, run checks (npm run test && npm run lint && npm run build), commit and push, update the journal."
        } else {
            $msg = "Autonomous iteration $($iterCount + 1). Read AUTO_IMPROVE.md and continue the improvement cycle: implement the next improvement, run checks (npm run test && npm run lint && npm run build), commit and push, update the journal, then find another improvement."
        }

        $keepGoing = Invoke-Run -Msg $msg -Final $isFinal
    } while ($keepGoing -and $sw.Elapsed -lt $deadline)
} finally {
    if ($script:proxyProc -and -not $script:proxyProc.HasExited) {
        Stop-Process -Id $script:proxyProc.Id -Force -ErrorAction SilentlyContinue
        $script:proxyProc.WaitForExit()
        Write-Host 'Throttle proxy stopped.' -ForegroundColor Cyan
    }
}

$sw.Stop()
$totMin = [math]::Round($sw.Elapsed.TotalMinutes, 1)
$realIter = $iterCount
Write-Host ""
if ($script:stoppedNoop) {
    Write-Host "STOPPED EARLY: the model produced no output - check the provider (free-tier quota / API key / network / 429). Work is preserved in git stash (git stash list)." -ForegroundColor Red
}
Write-Host "DONE: $totMin min, $realIter iterations. Summary in AUTO_IMPROVE.md and git log." -ForegroundColor Green