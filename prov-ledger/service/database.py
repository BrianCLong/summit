import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./prov_ledger.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

claim_evidence_association = Table(
    'claim_evidence_association', Base.metadata,
    Column('claim_id', Integer, ForeignKey('claims.id')),
    Column('evidence_id', Integer, ForeignKey('evidence.id'))
)

class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    url = Column(String, nullable=True)

class Transform(Base):
    __tablename__ = "transforms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)

class License(Base):
    __tablename__ = "licenses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    url = Column(String, nullable=True)

class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    checksum = Column(String, unique=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"))
    transform_id = Column(Integer, ForeignKey("transforms.id"))
    license_id = Column(Integer, ForeignKey("licenses.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source")
    transform = relationship("Transform")
    license = relationship("License")

claim_relationship = Table(
    'claim_relationship', Base.metadata,
    Column('source_claim_id', Integer, ForeignKey('claims.id'), primary_key=True),
    Column('target_claim_id', Integer, ForeignKey('claims.id'), primary_key=True),
    Column('relationship_type', String, primary_key=True)  # 'supports' or 'contradicts'
)

class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    evidence = relationship("Evidence", secondary=claim_evidence_association)

    related_claims = relationship(
        "Claim",
        secondary=claim_relationship,
        primaryjoin=id == claim_relationship.c.source_claim_id,
        secondaryjoin=id == claim_relationship.c.target_claim_id,
        backref="related_to"
    )

disclosure_bundle_evidence_association = Table(
    'disclosure_bundle_evidence_association', Base.metadata,
    Column('disclosure_bundle_id', Integer, ForeignKey('disclosure_bundles.id')),
    Column('evidence_id', Integer, ForeignKey('evidence.id'))
)

class DisclosureBundle(Base):
    __tablename__ = "disclosure_bundles"
    id = Column(Integer, primary_key=True, index=True)
    merkle_root = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    evidence = relationship("Evidence", secondary=disclosure_bundle_evidence_association)

def create_tables():
    Base.metadata.create_all(bind=engine)
