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
$frontendExecutable = (Get-Command node -ErrorAction Stop).Source

if (-not (Test-Path $frontendVite)) {
  throw "Vite entrypoint not found at $frontendVite. Run frontend dependency installation first."
}

function Write-ProcessMetadata {
  param(
    [string]$MetadataPath,
    [System.Diagnostics.Process]$Process,
    [string]$Role,
    [string]$Workdir,
    [string]$ExecutablePath
  )

  $metadata = @{
    pid = $Process.Id
    role = $Role
    workdir = $Workdir
    executable_path = $ExecutablePath
  }
  $metadata | ConvertTo-Json | Set-Content -Path $MetadataPath -Encoding utf8
}

function Read-ProcessMetadata {
  param(
    [string]$MetadataPath
  )

  if (-not (Test-Path $MetadataPath)) {
    return $null
  }

  try {
    return Get-Content $MetadataPath -Raw | ConvertFrom-Json
  } catch {
    Remove-Item $MetadataPath -Force -ErrorAction SilentlyContinue
    return $null
  }
}

function Join-ProcessArguments {
  param(
    [string[]]$Arguments
  )

  return ($Arguments | ForEach-Object {
    if ($_ -match '\s|"') {
      '"' + ($_ -replace '"', '\"') + '"'
    } else {
      $_
    }
  }) -join ' '
}

function Stop-TrackedProcess {
  param(
    [string]$MetadataPath
  )

  $metadata = Read-ProcessMetadata -MetadataPath $MetadataPath
  if ($null -eq $metadata) {
    return
  }

  $process = Get-Process -Id $metadata.pid -ErrorAction SilentlyContinue
  if ($null -ne $process) {
    $expectedPath = [System.IO.Path]::GetFullPath([string]$metadata.executable_path)
    $actualPath = if ($process.Path) { [System.IO.Path]::GetFullPath($process.Path) } else { "" }

    if ($actualPath -ieq $expectedPath) {
      Stop-Process -Id $metadata.pid -ErrorAction SilentlyContinue
      try {
        $process.WaitForExit(5000)
      } catch {
      }
    } else {
      Write-Warning "Skipping PID $($metadata.pid) because it no longer matches the tracked $($metadata.role) executable."
    }
  }

  Remove-Item $MetadataPath -Force -ErrorAction SilentlyContinue
}

function Start-DetachedProcess {
  param(
    [string]$ExecutablePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  return Start-Process `
    -FilePath $ExecutablePath `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden `
    -PassThru
}

function Start-PowerShellWorker {
  param(
    [string]$WorkingDirectory,
    [string]$Command
  )

  $powershellExecutable = (Get-Command powershell -ErrorAction Stop).Source
  return Start-DetachedProcess `
    -ExecutablePath $powershellExecutable `
    -Arguments @(
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Set-Location -LiteralPath '$($WorkingDirectory -replace '''', '''''')'; $Command"
    ) `
    -WorkingDirectory $WorkingDirectory
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

Stop-TrackedProcess -MetadataPath $backendPidFile
Stop-TrackedProcess -MetadataPath $frontendPidFile

$backendCommand = "& '$($backendExecutable -replace '''', '''''')' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
$backend = Start-PowerShellWorker `
  -WorkingDirectory $backendWorkdir `
  -Command $backendCommand

$frontend = Start-DetachedProcess `
  -ExecutablePath $frontendExecutable `
  -Arguments @($frontendVite, "--host", "127.0.0.1", "--port", "7860") `
  -WorkingDirectory $frontendWorkdir

Write-ProcessMetadata -MetadataPath $backendPidFile -Process $backend -Role "backend" -Workdir $backendWorkdir -ExecutablePath ((Get-Command powershell -ErrorAction Stop).Source)
Write-ProcessMetadata -MetadataPath $frontendPidFile -Process $frontend -Role "frontend" -Workdir $frontendWorkdir -ExecutablePath $frontendExecutable

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
