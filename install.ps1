# Basekit installer for Windows PowerShell. All logic lives in setup.js.
# Usage: .\install.ps1 [--yes] [--dry-run] [--no-plugins] [--no-rules] [--uninstall]
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Basekit needs Node.js 18 or later on PATH.'
  exit 1
}
& node (Join-Path $PSScriptRoot 'setup.js') @args
exit $LASTEXITCODE
