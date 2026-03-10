package summit.war_cop

deny[msg] {
  input.output_type == "brief"
  contains(lower(input.text), "target coordinates")
  msg := "war_cop output contains prohibited targeting content"
}

deny[msg] {
  input.output_type == "brief"
  contains(lower(input.text), "strike ")
  msg := "war_cop output contains prohibited targeting content"
}
