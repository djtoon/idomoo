# Uninstall the Idomoo CLI binary installed by install.ps1.
# Usage:
#   irm https://idomoo.com/cli/uninstall.ps1 | iex

[CmdletBinding()]
param(
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\idomoo"
)

$ErrorActionPreference = "Stop"
$BinName = "idomoo.exe"
$target  = Join-Path $InstallDir $BinName

if (Test-Path $target) {
  Remove-Item -Force $target
  Write-Host "✓ Removed $target" -ForegroundColor Green
} else {
  Write-Host "! $target not found — nothing to uninstall." -ForegroundColor Yellow
}

# Strip from user PATH
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -match [regex]::Escape($InstallDir)) {
  $newPath = ($userPath -split ';' | Where-Object { $_ -ne $InstallDir }) -join ';'
  [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
  Write-Host "✓ Removed $InstallDir from user PATH (open a new terminal)." -ForegroundColor Green
}

$configDir = Join-Path $env:USERPROFILE ".idomoo"
if (Test-Path $configDir) {
  Write-Host ""
  Write-Host "Config directory still exists: $configDir"
  Write-Host "Delete it with:  Remove-Item -Recurse -Force '$configDir'"
}
