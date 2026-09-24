# run-improve.ps1 - supervisor for autonomous FitQuest improvement loop
# Runs the `improver` agent repeatedly, optionally continuing the SAME opencode
# session (or starting a FRESH one every iteration), until the wall-clock timer
# OR a usage budget expires. Prints progress between iterations.
#
# Iterations finish on a NATURAL point, not a hard timer: after the per-iteration
# window the agent gets a grace period to reach a green commit. WIP is NEVER
# stashed - unfinished changes stay in the tree and the next session finishes
# them first (see the iteration prompts). A checkpoint commit preserves anything
# still dirty when the run hard-stops at the global deadline.
#
# Usage:  .\скрипт\run-improve.ps1 -Minutes 60            (inside project)
#         .\скрипт\run-improve.ps1 -Minutes 120 -IterMinutes 10          # 2h, 10-min iterations
#         .\скрипт\run-improve.ps1 -Minutes 360 -IterMinutes 20 -Rpm 12 -MaxRequests 900
#
# Budgets (defaults sized for a Gemini free-tier plan: 15 rpm / 1000 req/day):
#   -Rpm 12              paces the upstream so the plan's rpm limit is never hit
#   -DailyReq 1000       HARD daily request cap enforced by the proxy, shared
#                        across all runs in the same day (persisted in logs/)
#   -MaxRequests 900     SOFT stop: schedule a FINAL iteration when this run has
#                        burned that many requests, then stop on a green commit
#   -MaxInputTokensK 0   optional per-day input-token budget in thousands (0=off)
#                        NOTE: 250K TPM usually does NOT bind; requests/day does.
#   -FreshSessionEvery 1 start a NEW opencode session every N iterations. A long
#                        single session grows input tokens per request roughly
#                        quadratically; fresh sessions keep context small so the
#                        token budget lasts far longer. 0 = keep the old behavior
#                        (continue one session for the whole run).
#
# Throttling (default ON): the script runs proxy-throttle.cjs that paces requests
# to the upstream LLM API and enforces the budgets above. Use -NoThrottle to skip
# budgets entirely (NOT recommended).
#
# Requires: opencode in PATH, agent `.opencode/agents/improver.md`, AUTO_IMPROVE.md
param(
    [int]$Minutes = 60,
    [int]$IterMinutes = 8,
    [string]$Project = (Get-Location).Path,
    [string]$Agent = 'improver',
    [string]$SessionId = '',
    [string]$Model = 'google/gemini-3.5-flash-lite',
    [int]$Rpm = 12,
    [int]$DailyReq = 1000,
    [int]$MaxRequests = 900,
    [int]$MaxInputTokensK = 0,
    [int]$FreshSessionEvery = 1,
    [int]$Port = 4040,
    [string]$ThrottleUpstream = 'https://generativelanguage.googleapis.com/v1beta/openai',
    [switch]$NoThrottle
)

$ErrorActionPreference = 'Stop'

if (-not $env:GEMINI_API_KEY) {
    $env:GEMINI_API_KEY = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY', 'User')
}
if (-not $env:GEMINI_API_KEY) {
    Write-Host 'ERROR: GEMINI_API_KEY is not set (required by google/gemini-3.5-flash-lite).' -ForegroundColor Red
    exit 1
}

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
        Write-Host 'Throttle proxy: disabled (-NoThrottle). Running at full rate, no budgets.' -ForegroundColor DarkYellow
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
    $p = Start-Process -FilePath $nodeExe -ArgumentList @(
        $proxyJs, '--port', "$Port", '--rpm', "$Rpm", '--daily-req', "$DailyReq",
        '--max-input-k', "$MaxInputTokensK", '--upstream', $ThrottleUpstream
    ) `
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
    Write-Host ("Throttle proxy up on 127.0.0.1:{0} ({1} rpm, daily hard cap {2} req, soft {3}, {4}K input). Model: {5}" -f `
        $Port, $Rpm, $DailyReq, $MaxRequests, $MaxInputTokensK, $Model) -ForegroundColor Cyan
}

Start-ThrottleProxy

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$deadline = $sw.Elapsed + [TimeSpan]::FromMinutes($Minutes)
$iterCount = 0
$script:usedSession = $SessionId
$script:sessionStartIter = 0
$script:stoppedNoop = $false

$modelLabel = if ($NoThrottle) { "$Agent (default model)" } else { $Model }
$freshLabel = if ($FreshSessionEvery -le 0) { 'same session (legacy)' } elseif ($FreshSessionEvery -eq 1) { 'fresh session per iteration' } else { "fresh session every $FreshSessionEvery iters" }
Write-Host "FitQuest auto-improve: project=$Project minutes=$Minutes iterMinutes=$IterMinutes agent=$Agent model=$modelLabel sessions=$freshLabel" -ForegroundColor Cyan

function Get-ProxyUsage {
    if ($NoThrottle) { return $null }
    try {
        return Invoke-RestMethod -Uri "http://127.0.0.1:$Port/usage" -TimeoutSec 5
    } catch { return $null }
}

function Test-BudgetExhausted($usage) {
    if (-not $usage) { return $false }
    if ($MaxRequests -gt 0 -and $usage.requests -ge $MaxRequests) { return $true }
    if ($MaxInputTokensK -gt 0 -and ($usage.inputTokens / 1000) -ge $MaxInputTokensK) { return $true }
    return $false
}

function Test-CarrySession {
    if ($script:iterCount -le $script:sessionStartIter) { return $false }
    if ($FreshSessionEvery -le 0) { return $true }
    return (($script:iterCount - $script:sessionStartIter) -lt $FreshSessionEvery)
}

function Invoke-Run([string]$Msg, [bool]$Final) {
    $script:iterCount++
    $stamp = Get-Date -Format 'HHmmss'
    $logPath = Join-Path $logDir "iter-$($script:iterCount)-$stamp.log"
    $errPath = Join-Path $logDir "iter-$($script:iterCount)-$stamp.err.log"

    $argsList = @('run', '--agent', $Agent, '--auto')
    if (-not $NoThrottle) { $argsList += @('--model', $Model) }
    if (Test-CarrySession) {
        if ($script:usedSession) { $argsList += @('--session', $script:usedSession) }
        else { $argsList += '--continue' }
    }
    $argsList += ('"' + $Msg.Replace('"', '""') + '"')

    $tag = if ($Final) { 'FINAL' } else { 'iter' }
    Write-Host ("[{0}] {1}: launching opencode..." -f $script:iterCount, $tag) -ForegroundColor Yellow

    if (Get-Command git -ErrorAction SilentlyContinue) {
        $dirty = @(& git -C $Project status --porcelain --untracked-files=no 2>&1)
        if ($LASTEXITCODE -eq 0 -and $dirty.Count -gt 0) {
            Write-Host ("  carrying over unfinished work (tracked x{0}) - agent must commit it first." -f $dirty.Count) -ForegroundColor Yellow
            ($dirty | Select-Object -First 8) | ForEach-Object { Write-Host ("      " + $_) -ForegroundColor DarkGray }
        }
    }

    $p = Start-Process -FilePath $opencodeExe -ArgumentList $argsList `
        -WorkingDirectory $Project -WindowStyle Hidden `
        -RedirectStandardOutput $logPath -RedirectStandardError $errPath -PassThru

    $procSw = [System.Diagnostics.Stopwatch]::StartNew()
    $windowMs = [int]([TimeSpan]::FromMinutes($IterMinutes).TotalMilliseconds)
    $remainingMs = [int](($deadline - $sw.Elapsed).TotalMilliseconds)
    if ($windowMs -gt $remainingMs) { $windowMs = $remainingMs }
    if ($windowMs -lt 1000) { $windowMs = 1000 }

    $wasKilled = -not $p.WaitForExit($windowMs)
    if ($wasKilled) {
        # Window elapsed but the agent is still mid-work. Do NOT kill immediately:
        # give it a grace period to reach a GREEN (committed, clean-tree) state. If
        # the worktree is still dirty when grace expires, kill WITHOUT stashing -
        # partial work stays in the tree and the next session finishes it.
        $graceS = [int](([TimeSpan]::FromMinutes([Math]::Max(2, $IterMinutes / 2))).TotalSeconds)
        $remainingS = [int](($deadline - $sw.Elapsed).TotalSeconds)
        if ($graceS -gt $remainingS) { $graceS = $remainingS }
        if ($graceS -gt 0) {
            Write-Host ("  window done, letting the agent wrap up (up to {0}s grace)..." -f $graceS) -ForegroundColor Magenta
        }
        $graceEnd = $procSw.Elapsed + [TimeSpan]::FromSeconds($graceS)
        $cleanStreak = 0
        while (-not $p.HasExited -and $procSw.Elapsed -lt $graceEnd) {
            Start-Sleep -Seconds 20
            if (Get-Command git -ErrorAction SilentlyContinue) {
                $dirty = @(& git -C $Project status --porcelain --untracked-files=no 2>&1)
                if ($LASTEXITCODE -eq 0 -and $dirty.Count -eq 0) {
                    $cleanStreak++
                    if ($cleanStreak -ge 3) {
                        Write-Host '  green tree reached - ending iteration on a commit.' -ForegroundColor Green
                        break
                    }
                } else {
                    $cleanStreak = 0
                }
            }
        }
        if (-not $p.HasExited) { $p.Kill(); $p.WaitForExit() }
        else { $wasKilled = $false }
        Write-Host '  iteration ended - any partial work stays in the tree (not stashed).' -ForegroundColor Magenta
    }
    $procSw.Stop()

    try {
        $sess = & $opencodeExe session list -n 1 --format json 2>$null | ConvertFrom-Json
        if ($sess -is [array]) { $sess = $sess[0] }
        if ($sess.id) {
            $script:usedSession = [string]$sess.id
            $script:sessionStartIter = $script:iterCount
            Write-Host ("  session now: {0}" -f $script:usedSession) -ForegroundColor DarkGray
        }
    } catch {}

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
        $usage = Get-ProxyUsage
        $budgetExhausted = Test-BudgetExhausted $usage
        $remainingSec = ($deadline - $sw.Elapsed).TotalSeconds
        $isFinal = $budgetExhausted -or ($remainingSec -le ([TimeSpan]::FromMinutes($IterMinutes).TotalSeconds))

        if ($budgetExhausted -and $script:iterCount -eq 0) {
            Write-Host "  budget already exhausted (requests=$($usage.requests), in=$([math]::Round($usage.inputTokens / 1000, 1))K) - not starting." -ForegroundColor Red
            break
        }

        if ($isFinal) {
            if ($budgetExhausted) {
                $msg = "FINAL ITERATION - the usage budget is almost spent (requests=$($usage.requests)/$MaxRequests). Finish the current improvement to a GREEN state (npm run test / lint / build), make the final commit and push, update AUTO_IMPROVE.md with the session summary and stop. Do not start new large tasks."
            } else {
                $msg = "FINAL ITERATION - almost out of time. Finish the current improvement to a GREEN state (npm run test / lint / build), make the final commit and push, update AUTO_IMPROVE.md with the session summary and stop. Do not start new large tasks."
            }
        } elseif ($iterCount -eq 0) {
            $msg = "First pass - IF 'git status --porcelain --untracked-files=no' shows uncommitted changes carried over from a previous session, FINISH and commit them FIRST (check git diff, run the checks, commit). Then take a BROAD look at the whole project: README, NOTES.md, GAME_DESIGN.md, AUTO_IMPROVE.md, the code under src/ and tests/. Understand what already works. Then pick the first most valuable quick improvement from the AUTO_IMPROVE.md queue (or find new ones), implement ONE, run checks (npm run test && npm run lint && npm run build), commit and push, update the journal."
        } else {
            $msg = "Autonomous iteration $($iterCount + 1). IF 'git status --porcelain --untracked-files=no' shows uncommitted changes carried over from the previous session, FINISH and commit them FIRST (git diff, run the checks, commit, push). Then read AUTO_IMPROVE.md and continue the improvement cycle: implement the next improvement, run checks (npm run test && npm run lint && npm run build), commit and push, update the journal, then find another improvement."
        }

        $keepGoing = Invoke-Run -Msg $msg -Final $isFinal

        if ($usage) {
            $usageLine = "usage: req=$($usage.requests)/$MaxRequests (hard $DailyReq/day)"
            if ($MaxInputTokensK -gt 0) { $usageLine += " | in=$([math]::Round($usage.inputTokens / 1000, 1))K/${MaxInputTokensK}K" }
            Write-Host ("  " + $usageLine) -ForegroundColor DarkCyan
        }

        if ($budgetExhausted) {
            Write-Host '  -> budget reached: stopping after a green FINAL iteration.' -ForegroundColor Yellow
            $keepGoing = $false
        }
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
    Write-Host "STOPPED EARLY: the model produced no output - check the provider (free-tier quota / API key / network / 429). Any partial work is still in the working tree (not stashed)." -ForegroundColor Red
}

# End of run: if a hard stop caught the agent mid-work, checkpoint the leftover
# tracked changes so nothing is lost. Never stash them - they stay on the branch.
if (Get-Command git -ErrorAction SilentlyContinue) {
    $dirty = @(& git -C $Project status --porcelain --untracked-files=no 2>&1)
    if ($LASTEXITCODE -eq 0 -and $dirty.Count -gt 0) {
        Write-Host ("Checkpointing {0} uncommitted tracked change(s) so nothing is lost..." -f $dirty.Count) -ForegroundColor Yellow
        try {
            & git -C $Project add -A 2>&1 | Out-Null
            & git -C $Project commit -m "improver: checkpoint @ run end (preserved WIP)" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                & git -C $Project push origin HEAD 2>&1 | Out-Null
                Write-Host '  -> checkpoint committed and pushed.' -ForegroundColor Green
            } else {
                Write-Host '  -> nothing to commit (tree clean or commit failed).' -ForegroundColor DarkGray
            }
        } catch {
            Write-Host ("  checkpoint failed: " + $_.Exception.Message) -ForegroundColor Red
        }
    }
}

Write-Host "DONE: $totMin min, $realIter iterations. Summary in AUTO_IMPROVE.md and git log." -ForegroundColor Green
