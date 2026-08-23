# run-until-credits.ps1
# Chains fresh headless Claude Code sessions until the work completes or the
# credits end. Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File .\run-until-credits.ps1
# NOTE: bypassPermissions removes every confirmation gate for these headless
# sessions. Trusted machine + repo only; everything is in git and reversible.

Set-Location $PSScriptRoot

$maxSessions = 15
$prompt = "Read RUN-BRIEF.md in this repository root and execute it faithfully. MORNING.md is the queue. If the autonomous queue is empty, write RUN-COMPLETE.flag to the repo root and stop."
$log = Join-Path $PSScriptRoot "run-chain.log"

Add-Content $log "`n########## CHAIN STARTED $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ##########"

for ($i = 1; $i -le $maxSessions; $i++) {

    if (Test-Path "RUN-COMPLETE.flag") {
        Add-Content $log "Queue empty (RUN-COMPLETE.flag found) - chain complete before session $i."
        break
    }

    Add-Content $log "`n===== SESSION $i - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ====="
    & claude -p $prompt --permission-mode bypassPermissions 2>&1 | Tee-Object -FilePath $log -Append
    $code = $LASTEXITCODE
    Add-Content $log "Session $i exited with code $code at $(Get-Date -Format 'HH:mm:ss')"

    if (Test-Path "RUN-COMPLETE.flag") {
        Add-Content $log "Queue empty (RUN-COMPLETE.flag found) - chain complete."
        break
    }

    if ($code -ne 0) {
        Add-Content $log "Non-zero exit - waiting 10 minutes, then one retry (may be a usage limit)."
        Start-Sleep -Seconds 600
        & claude -p $prompt --permission-mode bypassPermissions 2>&1 | Tee-Object -FilePath $log -Append
        if ($LASTEXITCODE -ne 0) {
            Add-Content $log "Second consecutive failure - stopping the chain (credits likely exhausted)."
            break
        }
    }

    Start-Sleep -Seconds 30
}

Add-Content $log "########## CHAIN ENDED $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ##########"
