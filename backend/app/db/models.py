import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class CandidateDB(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, default="Candidate")
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    skills = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    education = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    achievements = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("InterviewSessionDB", back_populates="candidate", cascade="all, delete-orphan")

class InterviewSessionDB(Base):
    __tablename__ = "interview_sessions"

    session_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=True)
    target_role = Column(String, nullable=False, default="Software Engineer")
    experience_level = Column(String, nullable=False, default="Senior (5+ yrs)")
    difficulty = Column(String, nullable=False, default="Intermediate")
    interview_type = Column(String, nullable=False, default="Mixed")
    stage = Column(String, nullable=False, default="Introduction")
    question_number = Column(Integer, default=0)
    max_questions = Column(Integer, default=5)
    current_question = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    candidate = relationship("CandidateDB", back_populates="sessions")
    messages = relationship("InterviewMessageDB", back_populates="session", cascade="all, delete-orphan", order_by="InterviewMessageDB.id")
    evaluations = relationship("AnswerEvaluationDB", back_populates="session", cascade="all, delete-orphan", order_by="AnswerEvaluationDB.question_number")

class InterviewMessageDB(Base):
    __tablename__ = "interview_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("interview_sessions.session_id"), nullable=False)
    role = Column(String, nullable=False)  # "assistant" or "user"
    content = Column(Text, nullable=False)
    stage = Column(String, nullable=True)
    question_number = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSessionDB", back_populates="messages")

class AnswerEvaluationDB(Base):
    __tablename__ = "answer_evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("interview_sessions.session_id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=True)
    answer_text = Column(Text, nullable=True)
    overall_score = Column(Float, default=7.0)
    clarity_score = Column(Float, default=7.0)
    technical_depth_score = Column(Float, default=7.0)
    relevance_score = Column(Float, default=7.0)
    feedback = Column(Text, nullable=True)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    follow_up_required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSessionDB", back_populates="evaluations")
