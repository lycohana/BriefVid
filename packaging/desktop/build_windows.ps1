$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$desktopDir = Join-Path $repoRoot "apps\desktop"

$python312 = (uv python find 3.12).Trim()
if (-not $python312) {
    throw "No Python 3.12 interpreter was found via uv."
}

Write-Host "Using Python 3.12:" $python312

Push-Location $desktopDir
try {
    npm run build:renderer
    & $python312 (Join-Path $repoRoot "packaging\pyinstaller\build_onedir.py")
    npm run build:electron
    npx electron-builder --win nsis --x64
}
finally {
    Pop-Location
}
