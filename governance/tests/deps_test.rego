import future.keywords
package deps.policy

test_unsigned_denied {
  deny contains "unsigned dep: badlib"
  with input as {"deps":[{"name":"badlib","version":"1.2.3","signed":false}]}
}
