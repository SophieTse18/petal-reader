# Petal Reader setup: run any time (for example after moving this folder).
#  1. Creates "Petal Reader" shortcuts on the Desktop and in the Start menu. They open the app in a
#     clean Microsoft Edge app window (Edge has the most natural voices).
#  2. Installs or updates the VS Code add-on (if VS Code is installed).
#  3. Keeps this folder "Always available on this device" when it lives in OneDrive, so it works offline.
param([switch]$SkipVSCode)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$app = Join-Path $root 'PetalReader.html'
$icon = Join-Path $root 'assets\petal.ico'
if (-not (Test-Path $app)) { throw "PetalReader.html was not found in $root" }

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$url = ([System.Uri]$app).AbsoluteUri
$shell = New-Object -ComObject WScript.Shell
function New-PetalShortcut([string]$path) {
  $s = $shell.CreateShortcut($path)
  if ($edge) {
    $s.TargetPath = $edge
    $s.Arguments = "--app=`"$url`""
    $s.WorkingDirectory = Split-Path $edge
  } else {
    $s.TargetPath = $app
    $s.WorkingDirectory = $root
  }
  if (Test-Path $icon) { $s.IconLocation = "$icon,0" }
  $s.Description = 'Petal Reader: read text aloud with word highlighting'
  $s.Save()
  Write-Host "  Shortcut: $path"
}

Write-Host 'Creating shortcuts...'
New-PetalShortcut (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Petal Reader.lnk')
New-PetalShortcut (Join-Path ([Environment]::GetFolderPath('Programs')) 'Petal Reader.lnk')
if (-not $edge) { Write-Host '  (Microsoft Edge was not found, so the shortcuts open your default browser.)' }

if (-not $SkipVSCode) {
  $vsix = Get-ChildItem (Join-Path $root 'vscode-extension') -Filter '*.vsix' -ErrorAction SilentlyContinue | Select-Object -First 1
  $code = Get-Command code -ErrorAction SilentlyContinue
  if ($vsix -and $code) {
    Write-Host 'Installing the VS Code add-on...'
    $ErrorActionPreference = 'Continue'
    & cmd.exe /d /c "code --install-extension `"$($vsix.FullName)`" --force >nul 2>&1"
    $ok = $LASTEXITCODE -eq 0
    $ErrorActionPreference = 'Stop'
    if ($ok) { Write-Host '  Done. Reload VS Code windows that were already open.' }
    else { Write-Host '  Could not install it automatically. See README.md, "VS Code add-on".' }
  } elseif ($vsix) {
    Write-Host 'VS Code was not found on the PATH; skipped the add-on.'
  }
}

$oneDrives = @($env:OneDrive, $env:OneDriveCommercial, $env:OneDriveConsumer) | Where-Object { $_ }
if ($oneDrives | Where-Object { $root.StartsWith($_, [System.StringComparison]::OrdinalIgnoreCase) }) {
  Write-Host 'Keeping this folder available offline (OneDrive)...'
  $ErrorActionPreference = 'Continue'
  & cmd.exe /d /c "attrib +P -U `"$root`" >nul 2>&1 & attrib +P -U `"$root\*`" /S /D >nul 2>&1"
  $ErrorActionPreference = 'Stop'
}

Write-Host ''
Write-Host 'All set! Open "Petal Reader" from your Desktop or Start menu.'
Write-Host 'To pin it: Start > All apps > Petal Reader > right-click > Pin to taskbar.'
