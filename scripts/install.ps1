# Idomoo CLI installer for Windows.
#
# Usage:
#   irm https://idomoo.com/cli/install.ps1 | iex
#   & ([scriptblock]::Create((irm 'https://idomoo.com/cli/install.ps1'))) -Version v0.1.1
#
# Parameters:
#   -Version <tag>     Install a specific release (default: latest).
#   -InstallDir <dir>  Install destination (default: $env:LOCALAPPDATA\Programs\idomoo).
#   -GithubRepo <r>    Override release source (default: djtoon/idomoo).

[CmdletBinding()]
param(
  [string]$Version    = "",
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\idomoo",
  [string]$GithubRepo = "djtoon/idomoo"
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"   # speeds up Invoke-WebRequest

$BinName = "idomoo.exe"

function Info ([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok   ([string]$msg) { Write-Host "✓  $msg"  -ForegroundColor Green }
function Warn ([string]$msg) { Write-Host "!  $msg"  -ForegroundColor Yellow }
function Die  ([string]$msg) { Write-Host "✗  $msg"  -ForegroundColor Red; exit 1 }

# ── arch detection ────────────────────────────────────────────────────────────
$arch = switch ($env:PROCESSOR_ARCHITECTURE) {
  "AMD64" { "x64" }
  "ARM64" { "arm64" }
  default { Die "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE" }
}
$os = "win"

# ── resolve version ───────────────────────────────────────────────────────────
if (-not $Version) {
  Info "Resolving latest release from github.com/$GithubRepo..."
  try {
    $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$GithubRepo/releases/latest" -UseBasicParsing
    $Version = $latest.tag_name
  } catch {
    Die "Couldn't reach GitHub. Pass -Version to install a specific tag."
  }
}

$asset = "$($BinName -replace '\.exe$','')-$os-$arch.exe"
$base  = "https://github.com/$GithubRepo/releases/download/$Version"

Ok "Version:  $Version"
Ok "Platform: $os-$arch"
Ok "Target:   $InstallDir\$BinName"

# ── download ─────────────────────────────────────────────────────────────────
$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "idomoo-install-$([guid]::NewGuid())")
try {
  Info "Downloading $asset..."
  Invoke-WebRequest -Uri "$base/$asset"      -OutFile (Join-Path $tmp $asset)      -UseBasicParsing
  Invoke-WebRequest -Uri "$base/checksums.txt" -OutFile (Join-Path $tmp "checksums.txt") -UseBasicParsing

  # ── verify ─────────────────────────────────────────────────────────────────
  Info "Verifying checksum..."
  $expectedLine = (Get-Content (Join-Path $tmp "checksums.txt")) | Where-Object { $_ -match " $([regex]::Escape($asset))$" } | Select-Object -First 1
  if (-not $expectedLine) { Die "Checksum for $asset not found." }
  $expected = ($expectedLine -split '\s+')[0].ToLower()
  $actual   = (Get-FileHash -Path (Join-Path $tmp $asset) -Algorithm SHA256).Hash.ToLower()
  if ($expected -ne $actual) { Die "Checksum mismatch: expected $expected, got $actual" }
  Ok "Checksum verified."

  # ── install ────────────────────────────────────────────────────────────────
  if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  }
  Move-Item -Force -Path (Join-Path $tmp $asset) -Destination (Join-Path $InstallDir $BinName)
  Ok "Installed $BinName to $InstallDir\$BinName"
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

# ── PATH ──────────────────────────────────────────────────────────────────────
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$pathDirty = $false
if ($userPath -notmatch [regex]::Escape($InstallDir)) {
  Info "Adding $InstallDir to your user PATH..."
  $newPath = if ([string]::IsNullOrEmpty($userPath)) { $InstallDir } else { "$userPath;$InstallDir" }
  [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
  $pathDirty = $true
} else {
  Ok "PATH already contains $InstallDir."
}

# Always refresh the CURRENT session's PATH so `idomoo` works without a restart.
if ($env:PATH -notmatch [regex]::Escape($InstallDir)) {
  $env:PATH = "$env:PATH;$InstallDir"
}

# Broadcast WM_SETTINGCHANGE so new processes (Explorer, Task Manager, new
# terminals) pick up the updated user PATH immediately — without a logoff.
if ($pathDirty) {
  try {
    $sig = @'
[DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
    IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
    uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
    $winApi = Add-Type -MemberDefinition $sig -Name NativeMethods -Namespace IdomooInstaller -PassThru -ErrorAction SilentlyContinue
    $HWND_BROADCAST = [IntPtr]0xFFFF
    $WM_SETTINGCHANGE = 0x001A
    $SMTO_ABORTIFHUNG = 0x0002
    $result = [UIntPtr]::Zero
    [void]$winApi::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", $SMTO_ABORTIFHUNG, 3000, [ref]$result)
    Ok "Broadcasted PATH change to running processes."
  } catch {
    Warn "Couldn't broadcast PATH change (harmless — new terminals will still pick it up)."
  }
}

Write-Host ""
Ok "Installation complete."
Write-Host ""
Write-Host "Try it now (this same PowerShell window):" -ForegroundColor Cyan
Write-Host "  idomoo --help"
Write-Host "  idomoo login"
Write-Host ""
if ($pathDirty) {
  Write-Host "If 'idomoo' isn't recognized, close & reopen your terminal," -ForegroundColor DarkGray
  Write-Host "or run the binary directly:" -ForegroundColor DarkGray
  Write-Host "  & `"$InstallDir\$BinName`" --help" -ForegroundColor DarkGray
}
