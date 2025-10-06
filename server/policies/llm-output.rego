package intelgraph.llm.output

default allow = true

allow = false {
  input.purpose == "search"
  input.citations == false
}
