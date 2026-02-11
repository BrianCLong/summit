import future.keywords.in
import future.keywords.if
package orchestra
default allow = false
allow if {
  input.env != "prod"
  input.loa <= 3
  not input.kill_switch
}
allow if {
  input.env == "prod"
  input.loa <= 1
  not input.kill_switch
}