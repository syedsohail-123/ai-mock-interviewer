import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.cv import CandidateProfile, PersonalInfo, Experience, Education, Project
from app.schemas.interview import InterviewConfig, InterviewStage, InterviewDifficulty, InterviewType
from app.services.interview_service import interview_service
from app.services.cv_parser_service import cv_parser_service

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_cv_heuristics_extraction():
    sample_text = """
    Alex Mercer
    alex.mercer@example.com
    555-019-2834
    linkedin.com/in/alexmercer

    Summary:
    Senior Software Engineer with 6+ years of experience building scalable backend microservices and distributed systems.

    Skills:
    Python, FastAPI, Docker, PostgreSQL, Redis, Kubernetes, Flutter

    Experience:
    Senior Software Engineer at Distributed Systems Corp
    Led architecture for real-time payment gateway processing 10k RPS.

    Education:
    Bachelor of Science in Computer Science from Stanford University
    """
    profile = cv_parser_service.extract_structured_profile(sample_text)
    assert profile.personal_info.name == "Alex Mercer"
    assert profile.personal_info.email == "alex.mercer@example.com"
    assert "Python" in profile.skills
    assert "FastAPI" in profile.skills
    assert "PostgreSQL" in profile.skills

@pytest.mark.asyncio
async def test_interview_state_machine_flow():
    profile = CandidateProfile(
        personal_info=PersonalInfo(name="Alex Mercer"),
        skills=["Python", "FastAPI", "Redis"],
        summary="Backend Architect",
        experience=[Experience(role="Lead Architect", company="ScaleTech", description="Cloud APIs")]
    )
    config = InterviewConfig(
        target_role="Senior Backend Engineer",
        difficulty=InterviewDifficulty.INTERMEDIATE,
        interview_type=InterviewType.TECHNICAL,
        max_questions=3
    )

    session = interview_service.create_session(profile, config)
    assert session.stage == InterviewStage.INTRO

    # 1. Start interview
    session, q1 = await interview_service.start_interview(session.session_id)
    assert session.question_number == 1
    assert len(q1) > 10

    # 2. Candidate answers question 1
    session, ev1, q2 = await interview_service.process_candidate_answer(
        session.session_id,
        "I have worked with Python and FastAPI for 5 years building resilient microservices with Redis caching."
    )
    assert ev1.overall_score >= 0.0
    assert session.question_number == 2
    assert q2 is not None

    # 3. Candidate answers question 2
    session, ev2, q3 = await interview_service.process_candidate_answer(
        session.session_id,
        "We used Redis cluster with write-through caching and strict TTL expiration policies."
    )
    assert session.question_number == 3

    # 4. Candidate answers question 3 (reaches max_questions = 3)
    session, ev3, closing = await interview_service.process_candidate_answer(
        session.session_id,
        "I monitor latency using Prometheus and Grafana alerts."
    )
    assert session.stage == InterviewStage.COMPLETED
    assert not session.is_active
    assert "concludes our mock interview" in closing

def test_unsupervised_answer_clustering():
    from app.ml.clustering import answer_clustering_service
    sample_answers = [
        "We used Redis caching with strict TTL invalidation and write-through cache to speed up database reads.",
        "For database optimization, we created PostgreSQL composite indexes on foreign keys and analyzed slow queries with EXPLAIN ANALYZE.",
        "I resolved team conflicts by conducting 1-on-1 meetings, understanding technical concerns, and designing a proof of concept.",
        "When disagreements happened regarding microservice architecture, we aligned on RFC documents and quantitative latency benchmarks."
    ]
    result = answer_clustering_service.cluster_interview_answers(sample_answers, n_clusters=2)
    assert result["num_clusters"] == 2
    assert len(result["clusters"]) == 2
    assert "insights" in result
