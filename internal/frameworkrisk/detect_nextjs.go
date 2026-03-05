package frameworkrisk

import (
    "encoding/json"
    "os"
    "path/filepath"
)

// PackageJSON represents a minimal package.json structure
type PackageJSON struct {
    Dependencies    map[string]string `json:"dependencies"`
    DevDependencies map[string]string `json:"devDependencies"`
}

// DetectNextJS checks a directory for a package.json containing next as a dependency.
func DetectNextJS(dir string) (bool, error) {
    path := filepath.Join(dir, "package.json")

    // If no package.json exists, return false
    if _, err := os.Stat(path); os.IsNotExist(err) {
        return false, nil
    }

    data, err := os.ReadFile(path)
    if err != nil {
        return false, err
    }

    var pkg PackageJSON
    if err := json.Unmarshal(data, &pkg); err != nil {
        return false, err
    }

    _, inDeps := pkg.Dependencies["next"]
    _, inDevDeps := pkg.DevDependencies["next"]

    return inDeps || inDevDeps, nil
}
