# IntelGraph CLI Installer for Windows
# Run: iwr -useb https://raw.githubusercontent.com/BrianCLong/summit/main/cli/scripts/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "BrianCLong/summit"
$InstallDir = "$env:LOCALAPPDATA\IntelGraph"
$Version = if ($env:VERSION) { $env:VERSION } else { "latest" }

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red; exit 1 }

function Get-LatestVersion {
    if ($Version -eq "latest") {
        try {
            $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
            $script:Version = $releases.tag_name -replace "cli-v", ""
        } catch {
            Write-Err "Could not determine latest version: $_"
        }
    }
    Write-Info "Installing version: $Version"
}

function Download-Binary {
    $binaryName = "intelgraph-win.exe"
    $downloadUrl = "https://github.com/$Repo/releases/download/cli-v$Version/$binaryName"

    Write-Info "Downloading from: $downloadUrl"

    $tmpDir = New-Item -ItemType Directory -Path "$env:TEMP\intelgraph-install" -Force
    $tmpFile = Join-Path $tmpDir "intelgraph.exe"

    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tmpFile -UseBasicParsing
    } catch {
        Write-Err "Download failed: $_"
    }

    return $tmpFile
}

function Verify-Checksum {
    param([string]$BinaryPath)

    $checksumUrl = "https://github.com/$Repo/releases/download/cli-v$Version/intelgraph-win.exe.sha256"

    Write-Info "Verifying checksum..."

    try {
        $expectedChecksum = (Invoke-WebRequest -Uri $checksumUrl -UseBasicParsing).Content.Split()[0].Trim()
        $actualChecksum = (Get-FileHash -Path $BinaryPath -Algorithm SHA256).Hash.ToLower()

        if ($expectedChecksum -ne $actualChecksum) {
            Write-Err "Checksum verification failed"
        }

        Write-Info "Checksum verified"
    } catch {
        Write-Warn "Could not verify checksum: $_"
    }
}

function Install-Binary {
    param([string]$BinaryPath)

    # Create install directory
    if (!(Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    $installPath = Join-Path $InstallDir "intelgraph.exe"

    Write-Info "Installing to: $installPath"

    # Stop any running instances
    Get-Process -Name "intelgraph" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    # Copy binary
    Copy-Item -Path $BinaryPath -Destination $installPath -Force

    # Create alias batch file
    $aliasPath = Join-Path $InstallDir "ig.cmd"
    "@echo off`n`"$installPath`" %*" | Out-File -FilePath $aliasPath -Encoding ASCII

    # Add to PATH if not already there
    $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($userPath -notlike "*$InstallDir*") {
        Write-Info "Adding to PATH..."
        [Environment]::SetEnvironmentVariable("PATH", "$userPath;$InstallDir", "User")
        $env:PATH = "$env:PATH;$InstallDir"
    }

    Write-Info "Installation complete!"
}

function Verify-Installation {
    try {
        $version = & "$InstallDir\intelgraph.exe" --version 2>&1
        Write-Host ""
        Write-Info "IntelGraph CLI installed successfully!"
        Write-Host $version
        Write-Host ""
        Write-Info "Run 'intelgraph --help' to get started"
        Write-Info "You may need to restart your terminal for PATH changes to take effect"
    } catch {
        Write-Warn "Installation complete but verification failed"
        Write-Warn "Try opening a new terminal and running 'intelgraph --version'"
    }
}

function Main {
    Write-Host @"
╔═══════════════════════════════════════╗
║     IntelGraph CLI Installer          ║
╚═══════════════════════════════════════╝

"@

    Get-LatestVersion
    $binaryPath = Download-Binary
    Verify-Checksum -BinaryPath $binaryPath
    Install-Binary -BinaryPath $binaryPath
    Verify-Installation

    # Cleanup
    Remove-Item -Path (Split-Path $binaryPath) -Recurse -Force -ErrorAction SilentlyContinue
}

Main
