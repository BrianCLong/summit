# TSConfig Integrity Policy
#
# Validates TypeScript configuration against organizational standards.

package pve.repo.tsconfig_integrity

import future.keywords.in
import future.keywords.if
import future.keywords.contains

default allow := true

# Required compiler options
required_options := {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
}

# Minimum target version
min_target := "ES2020"

# Allowed module resolutions
allowed_module_resolution := {"node", "bundler", "node16", "nodenext"}

# Check required options
deny contains msg if {
    some option, expected in required_options
    actual := input.compilerOptions[option]
    actual != expected
    msg := sprintf("Compiler option '%s' should be %v, got %v", [option, expected, actual])
}

deny contains msg if {
    some option, _ in required_options
    not option in object.keys(input.compilerOptions)
    msg := sprintf("Missing required compiler option: '%s'", [option])
}

# Check target version
deny contains msg if {
    target := input.compilerOptions.target
    not valid_target(target)
    msg := sprintf("TypeScript target '%s' is below minimum '%s'", [target, min_target])
}

# Check module resolution
deny contains msg if {
    resolution := lower(input.compilerOptions.moduleResolution)
    not resolution in allowed_module_resolution
    msg := sprintf("Module resolution '%s' is not in allowed list: %v", [resolution, allowed_module_resolution])
}

# Warn about missing strict mode
warnings contains msg if {
    not input.compilerOptions.strict == true
    msg := "Strict mode is not enabled - consider enabling for better type safety"
}

# Valid targets (in order)
target_order := ["ES5", "ES6", "ES2015", "ES2016", "ES2017", "ES2018", "ES2019", "ES2020", "ES2021", "ES2022", "ESNext"]

valid_target(target) if {
    upper_target := upper(target)
    upper_min := upper(min_target)
    target_idx := index_of(target_order, upper_target)
    min_idx := index_of(target_order, upper_min)
    target_idx >= min_idx
}

index_of(arr, elem) := i if {
    arr[i] == elem
}

allow if {
    count(deny) == 0
}

violations := [{"rule": "tsconfig_integrity", "message": msg, "severity": "error"} | some msg in deny]
warnings_list := [{"rule": "tsconfig_integrity", "message": msg, "severity": "warning"} | some msg in warnings]
