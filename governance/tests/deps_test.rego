package deps.policy

test_unsigned_denied {
  some msg
  deny[msg] with input as {"deps":[{"name":"badlib","version":"1.2.3","signed":false}]}
  msg == "unsigned dep: badlib"
}
