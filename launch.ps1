$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logsDir = Join-Path $root "logs"
$backendWorkdir = Join-Path $root "backend"
$frontendWorkdir = Join-Path $root "frontend"
$backendPython = Join-Path $root ".venv\\Scripts\\python.exe"
$frontendVite = Join-Path $frontendWorkdir "node_modules\\vite\\bin\\vite.js"
$backendPidFile = Join-Path $logsDir "backend.pid"
$frontendPidFile = Join-Path $logsDir "frontend.pid"
$backendStdout = Join-Path $logsDir "backend.out.log"
$backendStderr = Join-Path $logsDir "backend.err.log"
$frontendStdout = Join-Path $logsDir "frontend.out.log"
$frontendStderr = Join-Path $logsDir "frontend.err.log"

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

Write-Host "Starting Cutout Web Tool frontend and backend..."

$backendExecutable = if (Test-Path $backendPython) { $backendPython } else { "python" }
$frontendExecutable = "node"

if (-not (Test-Path $frontendVite)) {
  throw "Vite entrypoint not found at $frontendVite. Run frontend dependency installation first."
}

function Write-ProcessMetadata {
  param(
    [string]$Path,
    [System.Diagnostics.Process]$Process,
    [string]$Role,
    [string]$Workdir,
    [string]$CommandMarker
  )

  $metadata = @{
    pid = $Process.Id
    role = $Role
    workdir = $Workdir
    command_marker = $CommandMarker
  }
  $metadata | ConvertTo-Json | Set-Content -Path $Path -Encoding utf8
}

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
      return $true
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  return $false
}

$backend = Start-Process -FilePath $backendExecutable `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" `
  -WorkingDirectory $backendWorkdir `
  -RedirectStandardOutput $backendStdout `
  -RedirectStandardError $backendStderr `
  -WindowStyle Hidden `
  -PassThru

$frontend = Start-Process -FilePath $frontendExecutable `
  -ArgumentList $frontendVite, "--host", "127.0.0.1", "--port", "7860" `
  -WorkingDirectory $frontendWorkdir `
  -RedirectStandardOutput $frontendStdout `
  -RedirectStandardError $frontendStderr `
  -WindowStyle Hidden `
  -PassThru

Write-ProcessMetadata -Path $backendPidFile -Process $backend -Role "backend" -Workdir $backendWorkdir -CommandMarker "app.main:app"
Write-ProcessMetadata -Path $frontendPidFile -Process $frontend -Role "frontend" -Workdir $frontendWorkdir -CommandMarker "vite.js"

$backendReady = Wait-ForUrl -Url "http://127.0.0.1:8000/api/health"
$frontendReady = Wait-ForUrl -Url "http://127.0.0.1:7860"

Write-Host "Frontend: http://127.0.0.1:7860"
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Logs:"
Write-Host "  Frontend stdout: $frontendStdout"
Write-Host "  Frontend stderr: $frontendStderr"
Write-Host "  Backend stdout: $backendStdout"
Write-Host "  Backend stderr: $backendStderr"

if (-not $frontendReady -or -not $backendReady) {
  Write-Warning "One or more services did not become ready before timeout. Check the logs above."
}
