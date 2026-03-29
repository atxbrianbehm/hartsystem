param(
  [switch]$SkipInstall,
  [switch]$SkipMigrate,
  [switch]$SkipDev
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param(
    [string]$Name,
    [string]$InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $InstallHint"
  }
}

function Ensure-WingetPackage {
  param(
    [string]$CommandName,
    [string]$PackageId,
    [string]$DisplayName
  )

  if (Get-Command $CommandName -ErrorAction SilentlyContinue) {
    Write-Host "$DisplayName already available."
    return
  }

  if ($SkipInstall) {
    throw "$DisplayName is missing and -SkipInstall was provided."
  }

  Require-Command -Name winget -InstallHint "Install App Installer / winget first."

  Write-Host "Installing $DisplayName..."
  winget install --id $PackageId --exact --accept-package-agreements --accept-source-agreements
}

function Wait-ForDocker {
  param(
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      docker info | Out-Null
      Write-Host "Docker engine is ready."
      return
    } catch {
      Start-Sleep -Seconds 3
    }
  }

  throw "Docker engine did not become ready within $TimeoutSeconds seconds."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Ensure-WingetPackage -CommandName docker -PackageId Docker.DockerDesktop -DisplayName "Docker Desktop"
Ensure-WingetPackage -CommandName psql -PackageId PostgreSQL.PostgreSQL -DisplayName "PostgreSQL tools"
Require-Command -Name npm -InstallHint "Install Node.js first."

try {
  docker info | Out-Null
  Write-Host "Docker is already running."
} catch {
  $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $dockerDesktop)) {
    throw "Docker Desktop executable was not found at '$dockerDesktop'."
  }

  Write-Host "Starting Docker Desktop..."
  Start-Process -FilePath $dockerDesktop
  Wait-ForDocker
}

Write-Host "Starting PostgreSQL container..."
docker compose up -d postgres

if (-not $SkipMigrate) {
  Write-Host "Applying database migrations..."
  npm run db:migrate
}

if (-not $SkipDev) {
  Write-Host "Starting API and web dev servers..."
  npm run dev
}
