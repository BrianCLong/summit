import future.keywords
package reports

default allow = false

allow {
    input.method == "POST"
    input.path == "/v1/reports/render"
    input.user.roles[_] == "analyst"
}

deny {
    input.template.has_inline_scripts
}
