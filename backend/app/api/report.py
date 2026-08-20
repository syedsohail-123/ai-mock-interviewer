from fastapi import APIRouter, HTTPException
from app.schemas.evaluation import InterviewReport
from app.services.report_service import report_service
from app.ml.embeddings import semantic_service
from app.ml.clustering import answer_clustering_service
from app.services.interview_service import interview_service

router = APIRouter(prefix="/report", tags=["Report"])

@router.get("/{session_id}", response_model=InterviewReport)
async def get_interview_report(session_id: str):
    report = report_service.generate_report(session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Interview session or report not found.")
    return report

@router.get("/{session_id}/ml-analytics")
async def get_ml_analytics(session_id: str):
    session = interview_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    match_score = semantic_service.compute_job_match_score(
        session.candidate_profile.skills,
        session.config.target_role
    )
    
    answer_coherence_scores = []
    answers_corpus = []
    for ev in session.evaluations:
        q = ev.get("question_text", "")
        a = ev.get("answer_text", "")
        if a:
            answers_corpus.append(a)
        sim = semantic_service.calculate_text_similarity(q, a)
        answer_coherence_scores.append({
            "question_number": ev.get("question_number", 1),
            "coherence_index": round(sim, 2)
        })

    clustering_result = answer_clustering_service.cluster_interview_answers(answers_corpus, n_clusters=2)

    return {
        "candidate_role_match_score": match_score,
        "answer_coherence_analytics": answer_coherence_scores,
        "communication_depth_tier": "Advanced" if match_score > 85 else "Intermediate",
        "unsupervised_answer_clusters": clustering_result
    }
