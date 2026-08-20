from typing import Dict, Any, List
from app.schemas.evaluation import AnswerEvaluation
from app.schemas.interview import InterviewStage
from app.services.llm_service import llm_service

class EvaluationService:
    @staticmethod
    async def evaluate_answer(
        question_num: int,
        question: str,
        answer: str,
        stage: InterviewStage,
        target_role: str,
        skills: List[str]
    ) -> AnswerEvaluation:
        evaluation = await llm_service.evaluate_candidate_answer(
            question=question,
            answer=answer,
            stage=stage,
            target_role=target_role,
            skills=skills
        )
        evaluation.question_number = question_num
        evaluation.question_text = question
        evaluation.answer_text = answer
        return evaluation

evaluation_service = EvaluationService()
