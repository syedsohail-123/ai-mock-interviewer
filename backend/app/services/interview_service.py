import uuid
from datetime import datetime
from typing import Dict, Optional, Tuple
from app.schemas.cv import CandidateProfile
from app.schemas.interview import (
    InterviewSession,
    InterviewConfig,
    InterviewStage,
    InterviewMessage,
    InterviewType
)
from app.schemas.evaluation import AnswerEvaluation
from app.services.llm_service import llm_service
from app.services.evaluation_service import evaluation_service
from app.core.logging import logger
from app.db.database import SessionLocal
from app.db.models import (
    CandidateDB,
    InterviewSessionDB,
    InterviewMessageDB,
    AnswerEvaluationDB,
)

STAGE_TRANSITIONS = {
    InterviewStage.INTRO: InterviewStage.BACKGROUND,
    InterviewStage.BACKGROUND: InterviewStage.TECHNICAL,
    InterviewStage.TECHNICAL: InterviewStage.PROJECT_DEEP_DIVE,
    InterviewStage.PROJECT_DEEP_DIVE: InterviewStage.PROBLEM_SOLVING,
    InterviewStage.PROBLEM_SOLVING: InterviewStage.BEHAVIORAL,
    InterviewStage.BEHAVIORAL: InterviewStage.FINAL,
    InterviewStage.FINAL: InterviewStage.COMPLETED,
    InterviewStage.COMPLETED: InterviewStage.COMPLETED
}

class InterviewService:
    def __init__(self):
        self.sessions: Dict[str, InterviewSession] = {}

    def _persist_candidate_and_session(self, session: InterviewSession):
        if not SessionLocal:
            return
        try:
            with SessionLocal() as db:
                cand_id = session.candidate_profile.id or str(uuid.uuid4())
                cand = db.query(CandidateDB).filter_by(id=cand_id).first()
                if not cand:
                    cand = CandidateDB(
                        id=cand_id,
                        name=session.candidate_profile.personal_info.name,
                        email=session.candidate_profile.personal_info.email,
                        phone=session.candidate_profile.personal_info.phone,
                        location=session.candidate_profile.personal_info.location,
                        summary=session.candidate_profile.summary,
                        skills=session.candidate_profile.skills,
                        experience=[e.model_dump() for e in session.candidate_profile.experience],
                        education=[ed.model_dump() for ed in session.candidate_profile.education],
                        projects=[p.model_dump() for p in session.candidate_profile.projects],
                    )
                    db.add(cand)

                sess_db = db.query(InterviewSessionDB).filter_by(session_id=session.session_id).first()
                if not sess_db:
                    sess_db = InterviewSessionDB(
                        session_id=session.session_id,
                        candidate_id=cand_id,
                        target_role=session.config.target_role,
                        experience_level=session.config.experience_level,
                        difficulty=session.config.difficulty,
                        interview_type=session.config.interview_type.value if hasattr(session.config.interview_type, 'value') else str(session.config.interview_type),
                        stage=session.stage.value,
                        question_number=session.question_number,
                        max_questions=session.config.max_questions,
                        current_question=session.current_question,
                        is_active=session.is_active,
                    )
                    db.add(sess_db)
                else:
                    sess_db.stage = session.stage.value
                    sess_db.question_number = session.question_number
                    sess_db.current_question = session.current_question
                    sess_db.is_active = session.is_active
                    if session.completed_at:
                        sess_db.completed_at = datetime.utcnow()

                db.commit()
                logger.info(f"Persisted session {session.session_id} to Neon DB.")
        except Exception as e:
            logger.error(f"Error persisting session to Neon DB: {e}")

    def _persist_message(self, session_id: str, msg: InterviewMessage):
        if not SessionLocal:
            return
        try:
            with SessionLocal() as db:
                msg_db = InterviewMessageDB(
                    session_id=session_id,
                    role=msg.role,
                    content=msg.content,
                    stage=msg.stage.value if hasattr(msg.stage, 'value') else str(msg.stage) if msg.stage else None,
                    question_number=msg.question_number,
                )
                db.add(msg_db)
                db.commit()
        except Exception as e:
            logger.error(f"Error persisting message to Neon DB: {e}")

    def _persist_evaluation(self, session_id: str, eval_obj: AnswerEvaluation, question_text: str, answer_text: str):
        if not SessionLocal:
            return
        try:
            with SessionLocal() as db:
                q_num = getattr(eval_obj, 'question_number', getattr(eval_obj, 'question_num', 1))
                o_score = getattr(eval_obj, 'overall_score', getattr(eval_obj, 'score', 7.0))
                c_score = getattr(eval_obj, 'clarity_score', 7.0)
                t_score = getattr(eval_obj, 'technical_score', getattr(eval_obj, 'technical_depth_score', 7.0))
                r_score = getattr(eval_obj, 'correctness_score', getattr(eval_obj, 'relevance_score', 7.0))
                fb = getattr(eval_obj, 'improvement_feedback', getattr(eval_obj, 'feedback', ''))

                eval_db = AnswerEvaluationDB(
                    session_id=session_id,
                    question_number=q_num,
                    question_text=question_text,
                    answer_text=answer_text,
                    overall_score=float(o_score),
                    clarity_score=float(c_score),
                    technical_depth_score=float(t_score),
                    relevance_score=float(r_score),
                    feedback=str(fb),
                    strengths=eval_obj.strengths or [],
                    weaknesses=eval_obj.weaknesses or [],
                    follow_up_required=bool(eval_obj.follow_up_required),
                )
                db.add(eval_db)
                db.commit()
                logger.info(f"Persisted evaluation for question {q_num} to Neon DB.")
        except Exception as e:
            logger.error(f"Error persisting evaluation to Neon DB: {e}")

    def create_session(self, profile: CandidateProfile, config: InterviewConfig) -> InterviewSession:
        session_id = str(uuid.uuid4())
        session = InterviewSession(
            session_id=session_id,
            candidate_profile=profile,
            config=config,
            stage=InterviewStage.INTRO,
            question_number=0,
            conversation_history=[],
            evaluations=[],
            is_active=True,
            created_at=datetime.utcnow().isoformat()
        )
        self.sessions[session_id] = session
        self._persist_candidate_and_session(session)
        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        if session_id in self.sessions:
            return self.sessions[session_id]
        
        # Fallback to loading from Neon DB
        if SessionLocal:
            try:
                with SessionLocal() as db:
                    sess_db = db.query(InterviewSessionDB).filter_by(session_id=session_id).first()
                    if sess_db:
                        # Reconstruct session
                        cand = sess_db.candidate
                        profile = CandidateProfile(
                            id=cand.id if cand else str(uuid.uuid4()),
                            summary=cand.summary or "" if cand else "",
                            skills=cand.skills or [] if cand else [],
                        )
                        config = InterviewConfig(
                            target_role=sess_db.target_role,
                            experience_level=sess_db.experience_level,
                            difficulty=sess_db.difficulty,
                            max_questions=sess_db.max_questions,
                        )
                        session = InterviewSession(
                            session_id=sess_db.session_id,
                            candidate_profile=profile,
                            config=config,
                            stage=InterviewStage(sess_db.stage) if sess_db.stage in [s.value for s in InterviewStage] else InterviewStage.INTRO,
                            question_number=sess_db.question_number,
                            current_question=sess_db.current_question,
                            is_active=sess_db.is_active,
                            created_at=sess_db.created_at.isoformat() if sess_db.created_at else datetime.utcnow().isoformat(),
                        )
                        self.sessions[session_id] = session
                        return session
            except Exception as e:
                logger.error(f"Error loading session from Neon DB: {e}")

        return None

    async def start_interview(self, session_id: str) -> Tuple[InterviewSession, str]:
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        session.stage = InterviewStage.INTRO
        session.question_number = 1
        
        question = await llm_service.generate_interview_question(
            candidate_profile=session.candidate_profile,
            config=session.config,
            stage=session.stage,
            question_num=session.question_number,
        )
        session.current_question = question
        
        msg = InterviewMessage(
            role="assistant",
            content=question,
            stage=session.stage,
            question_number=session.question_number,
            timestamp=datetime.utcnow().isoformat()
        )
        session.conversation_history.append(msg)
        
        self._persist_candidate_and_session(session)
        self._persist_message(session.session_id, msg)
        return session, question

    async def process_candidate_answer(
        self, session_id: str, answer_text: str
    ) -> Tuple[InterviewSession, AnswerEvaluation, Optional[str]]:
        session = self.get_session(session_id)
        if not session or not session.is_active:
            raise ValueError(f"Active session {session_id} not found.")

        # Record candidate answer message
        user_msg = InterviewMessage(
            role="user",
            content=answer_text,
            stage=session.stage,
            question_number=session.question_number,
            timestamp=datetime.utcnow().isoformat()
        )
        session.conversation_history.append(user_msg)
        self._persist_message(session.session_id, user_msg)

        current_q_text = session.current_question or "Technical discussion"

        # 1. Evaluate current answer
        evaluation = await evaluation_service.evaluate_answer(
            question_num=session.question_number,
            question=current_q_text,
            answer=answer_text,
            stage=session.stage,
            target_role=session.config.target_role,
            skills=session.candidate_profile.skills
        )
        session.evaluations.append(evaluation.model_dump())
        self._persist_evaluation(session.session_id, evaluation, current_q_text, answer_text)

        # 2. Check if we have completed max questions or reached FINAL stage
        if session.question_number >= session.config.max_questions or session.stage == InterviewStage.FINAL:
            session.stage = InterviewStage.COMPLETED
            session.is_active = False
            session.completed_at = datetime.utcnow().isoformat()
            closing_statement = (
                f"Thank you, {session.candidate_profile.personal_info.name}. That concludes our mock interview! "
                "Your responses have been evaluated and your comprehensive performance report is now ready."
            )
            session.current_question = None
            closing_msg = InterviewMessage(
                role="assistant",
                content=closing_statement,
                stage=InterviewStage.COMPLETED,
                timestamp=datetime.utcnow().isoformat()
            )
            session.conversation_history.append(closing_msg)
            self._persist_message(session.session_id, closing_msg)
            self._persist_candidate_and_session(session)
            return session, evaluation, closing_statement

        # 3. Determine next stage and question
        if evaluation.follow_up_required and evaluation.follow_up_reason:
            next_stage = session.stage
        else:
            next_stage = STAGE_TRANSITIONS.get(session.stage, InterviewStage.COMPLETED)
        
        session.stage = next_stage
        session.question_number += 1

        prev_q = session.current_question
        next_question = await llm_service.generate_interview_question(
            candidate_profile=session.candidate_profile,
            config=session.config,
            stage=session.stage,
            question_num=session.question_number,
            prev_question=prev_q,
            prev_answer=answer_text,
            prev_eval=evaluation.model_dump()
        )
        session.current_question = next_question

        next_msg = InterviewMessage(
            role="assistant",
            content=next_question,
            stage=session.stage,
            question_number=session.question_number,
            timestamp=datetime.utcnow().isoformat()
        )
        session.conversation_history.append(next_msg)

        self._persist_candidate_and_session(session)
        self._persist_message(session.session_id, next_msg)

        return session, evaluation, next_question

interview_service = InterviewService()
