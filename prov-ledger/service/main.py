from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from . import crud, models, logic, database

# Create database tables on startup
database.create_tables()

app = FastAPI()

# API Endpoints
from fastapi import Response

@app.post("/evidence/", response_model=models.Evidence, status_code=201)
def create_evidence(evidence: models.EvidenceCreate, response: Response, db: Session = Depends(crud.get_db)):
    checksum = logic.generate_checksum(evidence.content)
    db_evidence = crud.get_evidence_by_checksum(db, checksum=checksum)
    if db_evidence:
        response.status_code = 200
        return db_evidence
    return crud.create_evidence(db=db, evidence=evidence, checksum=checksum)

@app.get("/evidence/{evidence_id}", response_model=models.Evidence)
def get_evidence(evidence_id: int, db: Session = Depends(crud.get_db)):
    db_evidence = crud.get_evidence(db, evidence_id=evidence_id)
    if db_evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return db_evidence

@app.post("/claims/", response_model=models.Claim)
def create_claim(claim: models.ClaimCreate, db: Session = Depends(crud.get_db)):
    return crud.create_claim(db=db, claim=claim)

@app.get("/claims/{claim_id}", response_model=models.Claim)
def get_claim(claim_id: int, db: Session = Depends(crud.get_db)):
    db_claim = crud.get_claim_with_evidence_ids(db, claim_id=claim_id)
    if db_claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    return db_claim

@app.post("/claims/{claim_id}/link", response_model=models.Claim)
def link_claim(claim_id: int, link: models.ClaimLink, db: Session = Depends(crud.get_db)):
    db_claim = crud.link_claim(
        db,
        source_claim_id=claim_id,
        target_claim_id=link.target_claim_id,
        relationship_type=link.relationship_type,
    )
    if db_claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    return db_claim

@app.post("/disclosures/", response_model=models.DisclosureBundle)
def create_disclosure_bundle(bundle: models.DisclosureBundleCreate, db: Session = Depends(crud.get_db)):
    evidence_checksums = []
    for evidence_id in bundle.evidence_ids:
        evidence = crud.get_evidence(db, evidence_id)
        if not evidence:
            raise HTTPException(status_code=404, detail=f"Evidence with ID {evidence_id} not found")
        evidence_checksums.append(evidence.checksum)

    merkle_root = logic.generate_merkle_root(evidence_checksums)

    db_bundle = crud.create_disclosure_bundle(db=db, bundle=bundle, merkle_root=merkle_root)
    return models.DisclosureBundle(
        id=db_bundle.id,
        evidence_ids=[evidence.id for evidence in db_bundle.evidence],
        merkle_root=db_bundle.merkle_root,
        created_at=db_bundle.created_at,
    )

@app.get("/disclosures/{bundle_id}", response_model=models.DisclosureBundle)
def get_disclosure_bundle(bundle_id: int, db: Session = Depends(crud.get_db)):
    db_bundle = crud.get_disclosure_bundle(db, bundle_id=bundle_id)
    if db_bundle is None:
        raise HTTPException(status_code=404, detail="Disclosure bundle not found")
    return models.DisclosureBundle.from_orm(db_bundle)

# Helper endpoints for creating dependent entities
@app.post("/sources/", response_model=models.Source)
def create_source(source: models.SourceCreate, db: Session = Depends(crud.get_db)):
    return crud.create_source(db=db, source=source)

@app.post("/transforms/", response_model=models.Transform)
def create_transform(transform: models.TransformCreate, db: Session = Depends(crud.get_db)):
    return crud.create_transform(db=db, transform=transform)

@app.post("/licenses/", response_model=models.License)
def create_license(license: models.LicenseCreate, db: Session = Depends(crud.get_db)):
    return crud.create_license(db=db, license=license)
