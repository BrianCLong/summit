import future.keywords
package repo.privacy

deny[msg] {
  input.diff.added_files[_] == file
  endswith(file, "routes/export.ts")
  not input.pr.labels[_] == "privacy-approved"
  msg := "PII export route added without privacy approval"
}