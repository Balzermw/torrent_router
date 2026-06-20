$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$packageJson = Get-Content -Path (Join-Path $repoRoot 'package.json') | ConvertFrom-Json
$version = $packageJson.version
$artifactDir = Join-Path $repoRoot 'store-artifacts'
$zipPath = Join-Path $artifactDir "synology-torrent-router-$version-chrome-extension.zip"

if (-not (Test-Path (Join-Path $repoRoot 'build\manifest.json'))) {
  throw "Build output not found. Run npm run build:extension first."
}

New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $repoRoot 'build\*') -DestinationPath $zipPath -CompressionLevel Optimal
Get-Item $zipPath | Select-Object FullName, Length, LastWriteTime
