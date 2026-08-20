from datetime import datetime
from typing import Optional, List
from app.schemas.evaluation import InterviewReport, QuestionReview
from app.services.interview_service import interview_service

class ReportService:
    @staticmethod
    def generate_report(session_id: str) -> Optional[InterviewReport]:
        session = interview_service.get_session(session_id)
        if not session:
            return None

        evals = session.evaluations
        if not evals:
            # Fallback baseline report if completed with minimal answers
            return InterviewReport(
                session_id=session_id,
                candidate_name=session.candidate_profile.personal_info.name,
                target_role=session.config.target_role,
                difficulty=session.config.difficulty.value,
                interview_type=session.config.interview_type.value,
                total_questions=0,
                overall_score_percentage=75.0,
                technical_score=75.0,
                communication_score=75.0,
                clarity_score=75.0,
                depth_score=75.0,
                problem_solving_score=75.0,
                strengths=["Good willingness to interview"],
                weaknesses=["Provide more detailed technical depth"],
                recommended_topics=["System Design", "Database Indexing", "API Scalability"],
                summary="Interview completed.",
                question_reviews=[],
                created_at=datetime.utcnow().isoformat()
            )

        n = len(evals)
        avg_tech = sum(e.get("technical_score", 7.0) for e in evals) / n * 10
        avg_comm = sum(e.get("communication_score", 7.0) for e in evals) / n * 10
        avg_clarity = sum(e.get("clarity_score", 7.0) for e in evals) / n * 10
        avg_depth = sum(e.get("depth_score", 7.0) for e in evals) / n * 10
        avg_ps = sum(e.get("problem_solving_score", 7.0) for e in evals) / n * 10
        avg_overall = sum(e.get("overall_score", 7.0) for e in evals) / n * 10

        all_strengths = []
        all_weaknesses = []
        reviews: List[QuestionReview] = []

        for e in evals:
            all_strengths.extend(e.get("strengths", []))
            all_weaknesses.extend(e.get("weaknesses", []))
            reviews.append(QuestionReview(
                question_number=e.get("question_number", 1),
                stage="Technical Assessment",
                question=e.get("question_text", "Interview question"),
                answer=e.get("answer_text", "Candidate response"),
                score=e.get("overall_score", 7.0) * 10,
                feedback=e.get("improvement_feedback", ""),
                strengths=e.get("strengths", []),
                weaknesses=e.get("weaknesses", [])
            ))

        unique_strengths = list(dict.fromkeys(all_strengths))[:5]
        unique_weaknesses = list(dict.fromkeys(all_weaknesses))[:5]

        # Recommended topics based on weaknesses and role
        recommended_topics = []
        if avg_tech < 80:
            recommended_topics.extend(["Deep Dive into Concurrency & Thread Safety", "High Throughput API Design"])
        if avg_depth < 80:
            recommended_topics.extend(["Distributed Caching & TTL Invalidation Patterns", "Database Query Optimization & Indexing"])
        if avg_comm < 80:
            recommended_topics.extend(["STAR Method for Behavioral & Architectural Explanations"])
        if not recommended_topics:
            recommended_topics = ["Advanced Distributed Consensus (Raft/Paxos)", "Cloud-Native Microservice Resiliency"]

        summary = (
            f"{session.candidate_profile.personal_info.name} demonstrated a strong foundational mastery for the "
            f"{session.config.target_role} ({session.config.difficulty.value}) position with an overall score of {avg_overall:.1f}/100. "
            f"Key strengths were observed in {', '.join(unique_strengths[:2]) or 'clear communication'}. "
            f"Focusing on {recommended_topics[0] if recommended_topics else 'system design'} will prepare them for top-tier senior evaluations."
        )

        return InterviewReport(
            session_id=session_id,
            candidate_name=session.candidate_profile.personal_info.name,
            target_role=session.config.target_role,
            difficulty=session.config.difficulty.value,
            interview_type=session.config.interview_type.value,
            total_questions=n,
            overall_score_percentage=round(avg_overall, 1),
            technical_score=round(avg_tech, 1),
            communication_score=round(avg_comm, 1),
            clarity_score=round(avg_clarity, 1),
            depth_score=round(avg_depth, 1),
            problem_solving_score=round(avg_ps, 1),
            strengths=unique_strengths if unique_strengths else ["Clear structured responses"],
            weaknesses=unique_weaknesses if unique_weaknesses else ["Could discuss deeper scaling trade-offs"],
            recommended_topics=recommended_topics,
            summary=summary,
            question_reviews=reviews,
            created_at=datetime.utcnow().isoformat()
        )

report_service = ReportService()
