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

# ── download helper ──────────────────────────────────────────────────────────
# Streams the response body so we can print progress without paying the 10x
# slowdown that Invoke-WebRequest's built-in progress bar costs.
function Download-WithProgress {
  param([string]$Url, [string]$OutFile, [string]$Label)

  $req = [System.Net.HttpWebRequest]::Create($Url)
  $req.AllowAutoRedirect = $true
  $req.UserAgent = "idomoo-installer/0.2"
  $resp = $req.GetResponse()
  $total = [int64]$resp.ContentLength
  $totalMB = if ($total -gt 0) { [math]::Round($total / 1MB, 1) } else { 0 }

  if ($total -gt 0) {
    Write-Host "==> Downloading $Label (~$totalMB MB)..." -ForegroundColor Cyan
  } else {
    Write-Host "==> Downloading $Label..." -ForegroundColor Cyan
  }

  $in  = $resp.GetResponseStream()
  $out = [System.IO.File]::Create($OutFile)
  $buf = New-Object byte[] 81920
  $read = 0
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $lastTick = 0

  try {
    while (($n = $in.Read($buf, 0, $buf.Length)) -gt 0) {
      $out.Write($buf, 0, $n)
      $read += $n
      # Print progress at most twice a second so output stays calm.
      if ($sw.ElapsedMilliseconds - $lastTick -ge 500) {
        $lastTick = $sw.ElapsedMilliseconds
        $mb = [math]::Round($read / 1MB, 1)
        $speed = if ($sw.Elapsed.TotalSeconds -gt 0) {
          [math]::Round(($read / 1MB) / $sw.Elapsed.TotalSeconds, 1)
        } else { 0 }
        if ($total -gt 0) {
          $pct = [math]::Round(($read / $total) * 100, 0)
          Write-Host -NoNewline "`r    $mb / $totalMB MB  ($pct%)  $speed MB/s     "
        } else {
          Write-Host -NoNewline "`r    $mb MB downloaded  $speed MB/s     "
        }
      }
    }
  } finally {
    $out.Close(); $in.Close(); $resp.Close()
  }
  Write-Host ""   # newline after progress line
  $elapsed = [math]::Round($sw.Elapsed.TotalSeconds, 1)
  Ok "$Label downloaded in ${elapsed}s"
}

# ── download ─────────────────────────────────────────────────────────────────
$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "idomoo-install-$([guid]::NewGuid())")
try {
  Download-WithProgress -Url "$base/$asset"        -OutFile (Join-Path $tmp $asset)        -Label $asset
  Download-WithProgress -Url "$base/checksums.txt" -OutFile (Join-Path $tmp "checksums.txt") -Label "checksums.txt"

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
  $destPath = Join-Path $InstallDir $BinName

  # Kill any running idomoo.exe so the file isn't locked by the OS.
  $running = Get-Process -Name "idomoo" -ErrorAction SilentlyContinue
  if ($running) {
    Info "Stopping running idomoo process(es) so the binary can be replaced..."
    $running | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300
  }

  # Best-effort remove old binary first (silences edge cases where Move-Item
  # hangs because the target path is reserved / handle-held by Explorer).
  if (Test-Path $destPath) {
    try { Remove-Item -Force -ErrorAction Stop $destPath } catch {
      Warn "Could not remove old $destPath — will try to overwrite."
    }
  }

  Move-Item -Force -Path (Join-Path $tmp $asset) -Destination $destPath
  Ok "Installed $BinName to $destPath"
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
