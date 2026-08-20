from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.cv import CandidateProfile

class InterviewStage(str, Enum):
    INTRO = "INTRO"
    BACKGROUND = "BACKGROUND"
    TECHNICAL = "TECHNICAL"
    PROJECT_DEEP_DIVE = "PROJECT_DEEP_DIVE"
    PROBLEM_SOLVING = "PROBLEM_SOLVING"
    BEHAVIORAL = "BEHAVIORAL"
    FINAL = "FINAL"
    COMPLETED = "COMPLETED"

class InterviewDifficulty(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"

class InterviewType(str, Enum):
    TECHNICAL = "Technical"
    BEHAVIORAL = "Behavioral"
    MIXED = "Mixed"
    PROJECT_DEEP_DIVE = "Project Deep Dive"

class InterviewConfig(BaseModel):
    target_role: str = "Software Engineer"
    experience_level: str = "Mid-Level"
    difficulty: InterviewDifficulty = InterviewDifficulty.INTERMEDIATE
    interview_type: InterviewType = InterviewType.MIXED
    max_questions: int = 7

class InterviewMessage(BaseModel):
    role: str  # "assistant", "user", "system"
    content: str
    stage: Optional[InterviewStage] = None
    question_number: Optional[int] = None
    timestamp: Optional[str] = None
    evaluation_id: Optional[str] = None

class InterviewSession(BaseModel):
    session_id: str
    candidate_profile: CandidateProfile
    config: InterviewConfig
    stage: InterviewStage = InterviewStage.INTRO
    question_number: int = 0
    current_question: Optional[str] = None
    conversation_history: List[InterviewMessage] = Field(default_factory=list)
    evaluations: List[Dict[str, Any]] = Field(default_factory=list)
    is_active: bool = True
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

class AnswerSubmission(BaseModel):
    session_id: str
    answer_text: str
    audio_data_base64: Optional[str] = None
