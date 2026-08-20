from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AnswerEvaluation(BaseModel):
    question_number: int
    question_text: str
    answer_text: str
    technical_score: float = Field(ge=0, le=10, default=7.0)
    communication_score: float = Field(ge=0, le=10, default=7.0)
    clarity_score: float = Field(ge=0, le=10, default=7.0)
    depth_score: float = Field(ge=0, le=10, default=7.0)
    problem_solving_score: float = Field(ge=0, le=10, default=7.0)
    correctness_score: float = Field(ge=0, le=10, default=7.0)
    overall_score: float = Field(ge=0, le=10, default=7.0)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    follow_up_required: bool = False
    follow_up_reason: Optional[str] = None
    improvement_feedback: str = ""

class QuestionReview(BaseModel):
    question_number: int
    stage: str
    question: str
    answer: str
    score: float
    feedback: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)

class InterviewReport(BaseModel):
    session_id: str
    candidate_name: str
    target_role: str
    difficulty: str
    interview_type: str
    total_questions: int
    overall_score_percentage: float  # e.g. 82.5%
    technical_score: float           # out of 100
    communication_score: float       # out of 100
    clarity_score: float             # out of 100
    depth_score: float               # out of 100
    problem_solving_score: float     # out of 100
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommended_topics: List[str] = Field(default_factory=list)
    summary: str = ""
    question_reviews: List[QuestionReview] = Field(default_factory=list)
    created_at: str = ""
