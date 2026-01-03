Param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet('wt-new', 'wt-rm')]
    [string]$Command,
    [Parameter(Position = 1)]
    [string]$Branch
)

function Show-Usage {
    Write-Error "Usage: ./agent-worktree.ps1 wt-new <branch> | wt-rm"
}

function Require-GitRepo {
    if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
        Write-Error "This command must be run inside a git repository."
        exit 1
    }
}

function Get-RepoRoot {
    Require-GitRepo
    git rev-parse --show-toplevel
}

function Invoke-MiseTrust {
    param(
        [string]$WorktreePath
    )

    if (Get-Command mise -ErrorAction SilentlyContinue) {
        try {
            mise trust $WorktreePath | Out-Null
        }
        catch {
            Write-Warning "'mise trust' failed for $WorktreePath"
        }
    }
}

function New-Worktree {
    param(
        [string]$BranchName
    )

    if (-not $BranchName) {
        Show-Usage
        exit 1
    }

    $repoRoot = Get-RepoRoot
    $base = Split-Path $repoRoot -Leaf
    $parent = Split-Path $repoRoot -Parent
    $worktreePath = Join-Path $parent "$base--$BranchName"

    if (Test-Path $worktreePath) {
        Write-Error "Worktree path already exists: $worktreePath"
        exit 1
    }

    $branchExists = git show-ref --verify --quiet "refs/heads/$BranchName"
    if ($LASTEXITCODE -eq 0) {
        git worktree add $worktreePath $BranchName
    }
    else {
        git worktree add -b $BranchName $worktreePath
    }

    Invoke-MiseTrust -WorktreePath $worktreePath
    Write-Output $worktreePath
}

function Confirm-Removal {
    if (Get-Command gum -ErrorAction SilentlyContinue) {
        gum confirm "Remove worktree and branch?"
        return ($LASTEXITCODE -eq 0)
    }

    $response = Read-Host "Remove worktree and branch? [y/N]"
    return ($response -eq 'y' -or $response -eq 'Y')
}

function Remove-Worktree {
    $currentRoot = Get-RepoRoot
    $name = Split-Path $currentRoot -Leaf
    $separatorIndex = $name.IndexOf('--')

    if ($separatorIndex -lt 0) {
        Write-Error "Current directory is not inside a worktree named <root>--<branch>; aborting."
        exit 1
    }

    $root = $name.Substring(0, $separatorIndex)
    $branch = $name.Substring($separatorIndex + 2)

    if ($root -eq $name -or -not $branch) {
        Write-Error "Current directory is not inside a worktree named <root>--<branch>; aborting."
        exit 1
    }

    if (-not (Confirm-Removal)) {
        Write-Error "Aborted by user."
        exit 1
    }

    $parent = Split-Path $currentRoot -Parent
    $originalRoot = Join-Path $parent $root

    if (-not (Test-Path (Join-Path $originalRoot '.git'))) {
        Write-Error "Original repo root not found at $originalRoot; aborting."
        exit 1
    }

    Push-Location $originalRoot
    try {
        git worktree remove $currentRoot --force
        git branch -D $branch
    }
    finally {
        Pop-Location
    }
}

switch ($Command) {
    'wt-new' { New-Worktree -BranchName $Branch }
    'wt-rm' { Remove-Worktree }
    default {
        Show-Usage
        exit 1
    }
}
