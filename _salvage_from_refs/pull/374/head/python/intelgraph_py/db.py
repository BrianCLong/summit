import os
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, func
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/intelgraph")

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()

class Schedule(Base):
  __tablename__ = "schedules"
  id = Column(Integer, primary_key=True, index=True)
  graph_id = Column(String, nullable=False)
  interval = Column(Integer, nullable=False)
  thresholds = Column(JSON, default={})
  last_run_metrics = Column(JSON, nullable=True)

class Subscription(Base):
  __tablename__ = "subscriptions"
  id = Column(Integer, primary_key=True, index=True)
  graph_id = Column(String, nullable=False)
  contact = Column(String, nullable=False)

class AlertLog(Base):
  __tablename__ = "alert_logs"
  id = Column(Integer, primary_key=True, index=True)
  graph_id = Column(String, nullable=False)
  detail = Column(JSON, nullable=False)
  created_at = Column(DateTime(timezone=True), server_default=func.now())

def init_db():
  Base.metadata.create_all(bind=engine)
