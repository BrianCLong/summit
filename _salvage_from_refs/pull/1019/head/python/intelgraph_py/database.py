import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database connection URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/intelgraph_db")

# Function to get the engine
def get_engine():
    return create_engine(DATABASE_URL)

# Function to get a SessionLocal class
def get_session_local(engine_instance):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine_instance)

# Base class for declarative models
Base = declarative_base()

# Dependency to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to create all tables
def create_db_tables():
    Base.metadata.create_all(bind=engine)
