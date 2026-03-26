param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,
  [string]$MongoUri = $env:MONGODB_URI,
  [switch]$Drop
)

if (-not $MongoUri) {
  $MongoUri = "mongodb://127.0.0.1:27017/wertech_db"
}

if (-not (Test-Path $ArchivePath)) {
  Write-Error "Archive not found: $ArchivePath"
  exit 1
}

Write-Host "Starting MongoDB restore..."
Write-Host "URI: $MongoUri"
Write-Host "Archive: $ArchivePath"

$args = @("--uri=$MongoUri", "--archive=$ArchivePath")
if ($ArchivePath.ToLower().EndsWith(".gz")) {
  $args += "--gzip"
}
if ($Drop) {
  $args += "--drop"
}

& mongorestore @args
if ($LASTEXITCODE -ne 0) {
  Write-Error "mongorestore failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Restore completed successfully."
