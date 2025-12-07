from sqlalchemy.orm import Session, joinedload
from . import models, database

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_source(db: Session, source: models.SourceCreate):
    db_source = database.Source(**source.model_dump())
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source

def get_source(db: Session, source_id: int):
    return db.query(database.Source).filter(database.Source.id == source_id).first()

def create_transform(db: Session, transform: models.TransformCreate):
    db_transform = database.Transform(**transform.model_dump())
    db.add(db_transform)
    db.commit()
    db.refresh(db_transform)
    return db_transform

def get_transform(db: Session, transform_id: int):
    return db.query(database.Transform).filter(database.Transform.id == transform_id).first()

def create_license(db: Session, license: models.LicenseCreate):
    db_license = database.License(**license.model_dump())
    db.add(db_license)
    db.commit()
    db.refresh(db_license)
    return db_license

def get_license(db: Session, license_id: int):
    return db.query(database.License).filter(database.License.id == license_id).first()

def create_evidence(db: Session, evidence: models.EvidenceCreate, checksum: str):
    db_evidence = database.Evidence(**evidence.model_dump(), checksum=checksum)
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence

def get_evidence(db: Session, evidence_id: int):
    return db.query(database.Evidence).filter(database.Evidence.id == evidence_id).first()

def get_evidence_by_checksum(db: Session, checksum: str):
    return db.query(database.Evidence).filter(database.Evidence.checksum == checksum).first()

def create_claim(db: Session, claim: models.ClaimCreate):
    db_claim = database.Claim(content=claim.content)
    for evidence_id in claim.evidence_ids:
        evidence = get_evidence(db, evidence_id)
        if evidence:
            db_claim.evidence.append(evidence)
    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)
    return db_claim

def get_claim_with_evidence_ids(db: Session, claim_id: int):
    claim = db.query(database.Claim).options(joinedload(database.Claim.evidence)).filter(database.Claim.id == claim_id).first()
    if claim:
        claim.evidence_ids = [evidence.id for evidence in claim.evidence]
    return claim

def link_claim(db: Session, source_claim_id: int, target_claim_id: int, relationship_type: str):
    source_claim = get_claim_with_evidence_ids(db, source_claim_id)
    target_claim = get_claim_with_evidence_ids(db, target_claim_id)
    if not source_claim or not target_claim:
        return None

    # This is a simplified way to add the relationship.
    # In a real application, you might want to use an association object.
    stmt = database.claim_relationship.insert().values(
        source_claim_id=source_claim_id,
        target_claim_id=target_claim_id,
        relationship_type=relationship_type,
    )
    db.execute(stmt)
    db.commit()
    return source_claim

def create_disclosure_bundle(db: Session, bundle: models.DisclosureBundleCreate, merkle_root: str):
    db_bundle = database.DisclosureBundle(merkle_root=merkle_root)
    for evidence_id in bundle.evidence_ids:
        evidence = get_evidence(db, evidence_id)
        if evidence:
            db_bundle.evidence.append(evidence)
    db.add(db_bundle)
    db.commit()
    db.refresh(db_bundle)
    return db_bundle

def get_disclosure_bundle(db: Session, bundle_id: int):
    return db.query(database.DisclosureBundle).options(joinedload(database.DisclosureBundle.evidence)).filter(database.DisclosureBundle.id == bundle_id).first()
