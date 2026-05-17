$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logsDir = Join-Path $root "logs"
$frontendPidFile = Join-Path $logsDir "frontend.pid"
$backendPidFile = Join-Path $logsDir "backend.pid"

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

function Stop-TrackedProcess {
  param(
    [string]$MetadataPath
  )

  $metadata = Read-ProcessMetadata -MetadataPath $MetadataPath
  if ($null -eq $metadata) {
    return
  }

  $process = Get-Process -Id $metadata.pid -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    Remove-Item $MetadataPath -Force -ErrorAction SilentlyContinue
    return
  }

  if (-not $metadata.executable_path) {
    Stop-Process -Id $metadata.pid -ErrorAction SilentlyContinue
    Remove-Item $MetadataPath -Force -ErrorAction SilentlyContinue
    return
  }

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

  Remove-Item $MetadataPath -Force -ErrorAction SilentlyContinue
}

Stop-TrackedProcess -MetadataPath $frontendPidFile
Stop-TrackedProcess -MetadataPath $backendPidFile
