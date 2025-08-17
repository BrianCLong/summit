Kind = "service-intentions"
Name = "ml"
Sources = [
  {
    Name   = "server"
    Action = "allow"
  },
  {
    Name   = "*"
    Action = "deny"
  }
]
