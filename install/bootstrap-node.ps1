$ErrorActionPreference = "Stop"

$index = Invoke-RestMethod "https://nodejs.org/dist/index.json"
$lts = $index | Where-Object { $_.lts } | Select-Object -First 1
$version = $lts.version
$zipName = "node-$version-win-x64.zip"
$zipPath = Join-Path $env:TEMP $zipName
$extractRoot = Join-Path $env:TEMP "tether-node"
$dest = Join-Path $env:LOCALAPPDATA "Tether\node"

Write-Host "Downloading Node.js $version..."
Invoke-WebRequest -Uri "https://nodejs.org/dist/$version/$zipName" -OutFile $zipPath

if (Test-Path $extractRoot) { Remove-Item $extractRoot -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Move-Item (Join-Path $extractRoot "node-$version-win-x64\*") $dest

Remove-Item $extractRoot -Recurse -Force
Remove-Item $zipPath -Force

Write-Host "Node.js is ready."
