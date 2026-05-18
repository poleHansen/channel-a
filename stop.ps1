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

function Get-ListeningProcessIds {
  param(
    [int]$Port
  )

  $matches = netstat -ano -p TCP | Select-String -Pattern "127\.0\.0\.1:$Port\s+.*LISTENING\s+(\d+)$"
  $processIds = @()

  foreach ($match in $matches) {
    if ($match.Matches.Count -gt 0) {
      $processIds += [int]$match.Matches[0].Groups[1].Value
    }
  }

  return $processIds | Sort-Object -Unique
}

function Stop-PortListeners {
  param(
    [int]$Port,
    [string[]]$AllowedProcessNames
  )

  foreach ($processId in Get-ListeningProcessIds -Port $Port) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
      continue
    }

    if ($AllowedProcessNames -contains $process.ProcessName.ToLowerInvariant()) {
      Stop-Process -Id $processId -ErrorAction SilentlyContinue
      try {
        $process.WaitForExit(5000)
      } catch {
      }
    }
  }
}

Stop-TrackedProcess -MetadataPath $frontendPidFile
Stop-TrackedProcess -MetadataPath $backendPidFile
Stop-PortListeners -Port 7860 -AllowedProcessNames @("node")
Stop-PortListeners -Port 8000 -AllowedProcessNames @("python", "powershell", "pwsh")
