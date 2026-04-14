Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$pythonPathEntries = @(
    (Join-Path $repoRoot "packages\core\src"),
    (Join-Path $repoRoot "packages\infra\src"),
    (Join-Path $repoRoot "apps\service\src")
)
$existingPythonPath = [Environment]::GetEnvironmentVariable("PYTHONPATH", "Process")
$env:PYTHONPATH = (($pythonPathEntries + @($existingPythonPath)) | Where-Object { $_ }) -join [IO.Path]::PathSeparator

$pythonExe = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

& $pythonExe -m video_sum_service
