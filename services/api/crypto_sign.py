import base64, os, json, hashlib
from nacl.signing import SigningKey
from nacl.encoding import RawEncoder
import psycopg2, boto3

DSN = os.getenv("POSTGRES_DSN","postgresql://postgres:pgpass@postgres:5432/intelgraph")
KMS_KEY_ID = os.getenv("KMS_KEY_ID")
kms = boto3.client("kms", region_name=os.getenv("AWS_REGION","us-east-1"))

def _wrap(plain: bytes) -> bytes:
    if not KMS_KEY_ID: return plain
    resp = kms.encrypt(KeyId=KMS_KEY_ID, Plaintext=plain)
    return resp["CiphertextBlob"]

def _unwrap(blob: bytes) -> bytes:
    if not KMS_KEY_ID: return blob
    resp = kms.decrypt(CiphertextBlob=blob)
    return resp["Plaintext"]

def _get_or_create_key():
    cx = psycopg2.connect(DSN); cx.autocommit = True
    cur = cx.cursor()
    cur.execute("SELECT public_key, private_key FROM signing_keys WHERE label=%s AND active",
                (os.getenv("SIGNING_KEY_LABEL","default"),))
    row = cur.fetchone()
    if row:
        priv_ct = base64.b64decode(row[1])
        priv = _unwrap(priv_ct)
        return SigningKey(priv)
    # create new
    sk = SigningKey.generate()
    pub_b64 = base64.b64encode(sk.verify_key.encode(encoder=RawEncoder)).decode()
    priv_wrapped_b64 = base64.b64encode(_wrap(sk.encode(encoder=RawEncoder))).decode()
    cur.execute("""INSERT INTO signing_keys(label, public_key, private_key)
                   VALUES (%s,%s,%s) ON CONFLICT DO NOTHING""",
                (os.getenv("SIGNING_KEY_LABEL","default"), pub_b64, priv_wrapped_b64))
    return sk

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def checksum_map(files: dict[str, bytes]) -> dict[str,str]:
    return {name: sha256_bytes(content) for name, content in files.items()}

def sign_manifest(manifest: dict) -> dict:
    sk = _get_or_create_key()
    payload = json.dumps(manifest, sort_keys=True).encode()
    sig = sk.sign(payload).signature
    return {"manifest": manifest, "signature": base64.b64encode(sig).decode()}