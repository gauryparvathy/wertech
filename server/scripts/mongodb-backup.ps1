param(
  [string]$MongoUri = $env:MONGODB_URI,
  [string]$BackupDir = (Join-Path (Resolve-Path "$PSScriptRoot\..") "backups"),
  [switch]$NoGzip
)

if (-not $MongoUri) {
  $MongoUri = "mongodb://127.0.0.1:27017/wertech_db"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$archivePath = Join-Path $BackupDir ("wertech-db-" + $timestamp + ".archive")
if (-not $NoGzip) {
  $archivePath = "$archivePath.gz"
}

Write-Host "Starting MongoDB backup..."
Write-Host "URI: $MongoUri"
Write-Host "Archive: $archivePath"

$args = @("--uri=$MongoUri", "--archive=$archivePath")
if (-not $NoGzip) {
  $args += "--gzip"
}

& mongodump @args
if ($LASTEXITCODE -ne 0) {
  Write-Error "mongodump failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Backup completed successfully."
