import csv
import io
import json
from datetime import datetime

from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from pydantic import BaseModel, Field
from prov.model import ProvDocument
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.exceptions import InvalidSignature

app = FastAPI()


# Models
class SignedProvDocument(BaseModel):
    document: dict  # PROV-JSON
    signature: str  # Hex-encoded signature

class Namespace(BaseModel):
    prefix: str
    uri: str


# In-memory storage
_prov_documents: dict[str, SignedProvDocument] = {}
_public_keys: dict[str, rsa.RSAPublicKey] = {}
_private_keys: dict[str, rsa.RSAPrivateKey] = {}
_namespaces: dict[str, str] = {} # For managing cross-domain namespaces
_green_lock_ledger: dict[str, ProvDocument] = {}


# Generate a key pair for demo purposes
key_id = "default_key"
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_private_keys[key_id] = private_key
_public_keys[key_id] = private_key.public_key()


# API Endpoints
@app.post("/namespace")
async def register_namespace(namespace: Namespace):
    if namespace.prefix in _namespaces:
        raise HTTPException(status_code=409, detail="Namespace prefix already registered")
    _namespaces[namespace.prefix] = namespace.uri
    return {"message": "Namespace registered"}

@app.post("/documents/{doc_id}")
async def submit_document(doc_id: str, signed_doc: SignedProvDocument):
    if doc_id in _prov_documents:
        raise HTTPException(status_code=409, detail="Document with this ID already exists")

    # Verify the signature
    public_key = _public_keys.get(key_id)  # In a real app, you'd look up the key
    if not public_key:
        raise HTTPException(status_code=500, detail="Public key not found")

    try:
        message = json.dumps(signed_doc.document, sort_keys=True).encode('utf-8')
        signature = bytes.fromhex(signed_doc.signature)
        public_key.verify(
            signature,
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
    except InvalidSignature:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception:
        raise HTTPException(status_code=500, detail="Error during verification")

    _prov_documents[doc_id] = signed_doc
    return {"message": "Document submitted and verified successfully"}


@app.get("/documents/{doc_id}", response_model=SignedProvDocument)
async def get_document(doc_id: str):
    if doc_id not in _prov_documents:
        raise HTTPException(status_code=404, detail="Document not found")
    return _prov_documents[doc_id]

@app.post("/documents/verify/{doc_id}")
async def verify_document_integrity(doc_id: str):
    if doc_id not in _prov_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    signed_doc = _prov_documents[doc_id]
    public_key = _public_keys.get(key_id)
    if not public_key:
        raise HTTPException(status_code=500, detail="Public key not found")

    try:
        message = json.dumps(signed_doc.document, sort_keys=True).encode('utf-8')
        signature = bytes.fromhex(signed_doc.signature)
        public_key.verify(
            signature,
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return {"verified": True}
    except InvalidSignature:
        return {"verified": False, "reason": "Invalid signature"}
    except Exception as e:
        return {"verified": False, "reason": str(e)}

@app.post("/migrate/green-lock-ledger")
async def migrate_green_lock_ledger(file: UploadFile = File(...)):
    content = await file.read()
    reader = csv.reader(io.StringIO(content.decode('utf-8')))

    for row in reader:
        pr_id, branch, author, timestamp, title = row

        doc = ProvDocument()
        doc.add_namespace("pr", "https://github.com/pulls/")
        doc.add_namespace("user", "https://github.com/")

        pr_entity = doc.entity(f"pr:{pr_id}", {
            "pr:branch": branch,
            "pr:title": title
        })
        author_agent = doc.agent(f"user:{author}")

        doc.wasAttributedTo(pr_entity, author_agent)

        _green_lock_ledger[pr_id] = doc

    return {"message": f"Migrated {len(_green_lock_ledger)} records from green-lock-ledger"}
