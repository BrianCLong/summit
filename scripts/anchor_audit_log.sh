#!/bin/bash
# compute root
psql -c "\copy (select this_hash from audit_log where at >= now()-interval '24 hours' order by id) to '/tmp/hashes.txt'"
python - <<'PY'
import hashlib,sys
leaves=[l.strip().encode() for l in open('/tmp/hashes.txt')]
def merkle(xs):
  if not xs: return b''
  L=[hashlib.sha256(x).digest() for x in xs]
  while len(L)>1:
    it=iter(L); L=[hashlib.sha256(a+(next(it) if (b:=next(it,None)) is None else b or b)).digest() for a in it]
  return L[0]
r=merkle(leaves); open('/tmp/root','wb').write(r)
print(r.hex())
PY
# sign & store
openssl dgst -sha256 -sign /keys/audit_anchor.key -out /tmp/root.sig /tmp/root
psql -c "insert into audit_anchors(day, merkle_root, sig) values (current_date, pg_read_binary_file('/tmp/root'), pg_read_binary_file('/tmp/root.sig'))"
