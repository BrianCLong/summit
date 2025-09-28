package goldenpath.license

allowed := {"MIT", "APACHE-2.0", "BSD-3-CLAUSE", "BSD-2-CLAUSE", "ISC"}

allow if {
  not violation
}

violation if {
  pkg := input.sbom.packages[_]
  not allowed[upper(pkg.license)]
}
