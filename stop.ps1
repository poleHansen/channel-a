$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logsDir = Join-Path $root "logs"
$frontendPidFile = Join-Path $logsDir "frontend.pid"
$backendPidFile = Join-Path $logsDir "backend.pid"

function Stop-TrackedProcess {
  param(
    [string]$MetadataPath
  )

  if (-not (Test-Path $MetadataPath)) {
    return
  }

  try {
    $metadata = Get-Content $MetadataPath -Raw | ConvertFrom-Json
  } catch {
    Remove-Item $MetadataPath -Force
    return
  }

  $process = Get-Process -Id $metadata.pid -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    Remove-Item $MetadataPath -Force
    return
  }

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($metadata.pid)"
  $commandLine = if ($null -ne $processInfo) { $processInfo.CommandLine } else { "" }

  if ($commandLine -and $commandLine -like "*$($metadata.command_marker)*" -and $commandLine -like "*$($metadata.workdir)*") {
    Stop-Process -Id $metadata.pid -ErrorAction SilentlyContinue
  } else {
    Write-Warning "Skipping PID $($metadata.pid) because it no longer matches the tracked $($metadata.role) process."
  }

  Remove-Item $MetadataPath -Force
}

Stop-TrackedProcess -MetadataPath $frontendPidFile
Stop-TrackedProcess -MetadataPath $backendPidFile
