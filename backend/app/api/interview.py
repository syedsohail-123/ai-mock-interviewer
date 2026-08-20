import json
import random
import string
import datetime
import time
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from pydantic import BaseModel, Field
from app.schemas.cv import CandidateProfile, PersonalInfo, Experience, Education, Project
from app.schemas.interview import (
    InterviewSession,
    InterviewConfig,
    AnswerSubmission,
    InterviewDifficulty,
    InterviewType,
)
from app.schemas.evaluation import AnswerEvaluation
from app.services.interview_service import interview_service
from app.services.stt_service import stt_service
from app.services.tts_service import tts_service
from app.services.cv_parser_service import cv_parser_service
from app.services.candidate_profile_service import candidate_profile_service
from app.core.logging import logger

router = APIRouter(prefix="/interview", tags=["Interview"])

# Persistent / In-memory access key storage
# Key format: "INT-XXXX" or "INT-XXXX-XX"
import os

KEYS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "interview_keys.json")
interview_access_keys: Dict[str, Dict[str, Any]] = {}

def load_keys_from_disk():
    global interview_access_keys
    try:
        if os.path.exists(KEYS_FILE):
            with open(KEYS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    interview_access_keys.update(data)
    except Exception as e:
        logger.warn(f"Failed to load keys from disk: {e}")

def save_keys_to_disk():
    try:
        serializable = {}
        for k, v in interview_access_keys.items():
            profile_obj = v.get("profile")
            config_obj = v.get("config")
            serializable[k] = {
                "access_key": k,
                "profile": profile_obj.model_dump() if hasattr(profile_obj, "model_dump") else profile_obj,
                "config": config_obj.model_dump() if hasattr(config_obj, "model_dump") else config_obj,
                "resume_data": v.get("resume_data", {}),
                "created_ts": v.get("created_ts", time.time()),
                "expires_at_ts": v.get("expires_at_ts", time.time() + 600),
                "created_at": v.get("created_at"),
            }
        with open(KEYS_FILE, 'w', encoding='utf-8') as f:
            json.dump(serializable, f, indent=2)
    except Exception as e:
        logger.warn(f"Failed to save keys to disk: {e}")

# Load existing keys on module load
load_keys_from_disk()

def generate_access_code() -> str:
    """Generate a clean, readable access key for candidates (e.g. INT-8492)."""
    digits = ''.join(random.choices(string.digits, k=4))
    suffix = ''.join(random.choices(string.ascii_uppercase, k=2))
    return f"INT-{digits}-{suffix}"

def map_resume_to_candidate_profile(resume_data: Dict[str, Any]) -> CandidateProfile:
    """Convert ATS Resume Builder schema to CandidateProfile schema."""
    basics = resume_data.get("basics", {})
    sections = resume_data.get("sections", {})

    personal_info = PersonalInfo(
        name=basics.get("name") or "Candidate",
        email=basics.get("email"),
        phone=basics.get("phone"),
        location=basics.get("location"),
        linkedin=basics.get("linkedin"),
        github=basics.get("github"),
    )

    # 1. Experience items
    experiences: List[Experience] = []
    exp_sec = sections.get("experience", {})
    for item in exp_sec.get("items", []):
        experiences.append(
            Experience(
                role=item.get("title") or "Software Engineer",
                company=item.get("subtitle") or "Technology Company",
                duration=item.get("date"),
                description=item.get("description"),
                technologies=item.get("tags") or [],
            )
        )

    # 2. Skills items
    all_skills: List[str] = []
    skills_sec = sections.get("skills", {})
    for item in skills_sec.get("items", []):
        if item.get("tags"):
            all_skills.extend(item.get("tags"))
        elif item.get("title"):
            all_skills.append(item.get("title"))

    # Deduplicate skills
    seen = set()
    deduped_skills = [s for s in all_skills if not (s in seen or seen.add(s))]

    # 3. Project items
    projects: List[Project] = []
    proj_sec = sections.get("projects", {})
    for item in proj_sec.get("items", []):
        projects.append(
            Project(
                title=item.get("title") or "Key Project",
                description=item.get("description") or "Implemented core architecture.",
                technologies=item.get("tags") or [],
                link=item.get("url"),
            )
        )

    # 4. Education items
    education: List[Education] = []
    edu_sec = sections.get("education", {})
    for item in edu_sec.get("items", []):
        education.append(
            Education(
                degree=item.get("title") or "Degree",
                institution=item.get("subtitle") or "University",
                year=item.get("date"),
            )
        )

    return CandidateProfile(
        personal_info=personal_info,
        summary=basics.get("summary") or "",
        skills=deduped_skills,
        experience=experiences,
        education=education,
        projects=projects,
    )

class GenerateKeyRequest(BaseModel):
    resume_data: Dict[str, Any]
    target_role: Optional[str] = None
    difficulty: Optional[str] = "Intermediate"
    interview_type: Optional[str] = "Mixed"

class GenerateKeyResponse(BaseModel):
    status: str
    access_key: str
    candidate_name: str
    target_role: str
    skills_count: int
    experience_count: int
    expires_in: str
    created_at: str

class ConnectKeyRequest(BaseModel):
    access_key: str

class ConnectKeyResponse(BaseModel):
    status: str
    session: InterviewSession
    candidate: CandidateProfile
    first_question: str
    audio_base64: Optional[str] = None

@router.post("/generate-access-key", response_model=GenerateKeyResponse)
async def generate_interview_access_key(req: GenerateKeyRequest):
    """Generate an Interview Access Key from the Web ATS Resume Builder."""
    profile = map_resume_to_candidate_profile(req.resume_data)
    profile = candidate_profile_service.enrich_profile(profile)

    target_role = req.target_role or req.resume_data.get("basics", {}).get("headline") or "Software Engineer"
    
    # Map difficulty
    diff = InterviewDifficulty.INTERMEDIATE
    if req.difficulty == "Beginner":
        diff = InterviewDifficulty.BEGINNER
    elif req.difficulty == "Advanced":
        diff = InterviewDifficulty.ADVANCED

    # Map type
    itype = InterviewType.MIXED
    if req.interview_type == "Technical":
        itype = InterviewType.TECHNICAL
    elif req.interview_type == "Behavioral":
        itype = InterviewType.BEHAVIORAL
    elif req.interview_type == "Project Deep Dive":
        itype = InterviewType.PROJECT_DEEP_DIVE

    config = InterviewConfig(
        target_role=target_role,
        experience_level="Experienced",
        difficulty=diff,
        interview_type=itype,
        max_questions=7,
    )

    access_key = generate_access_code()
    now_ts = time.time()
    expires_in_secs = 10 * 60  # 10 minutes (600 seconds)
    expires_at_ts = now_ts + expires_in_secs
    created_iso = datetime.datetime.now().isoformat()

    interview_access_keys[access_key] = {
        "access_key": access_key,
        "profile": profile,
        "config": config,
        "resume_data": req.resume_data,
        "created_ts": now_ts,
        "expires_at_ts": expires_at_ts,
        "created_at": created_iso,
    }
    save_keys_to_disk()

    logger.info(f"Generated interview key {access_key} for candidate {profile.personal_info.name} ({target_role}), expires in 10 minutes")

    return GenerateKeyResponse(
        status="success",
        access_key=access_key,
        candidate_name=profile.personal_info.name,
        target_role=target_role,
        skills_count=len(profile.skills),
        experience_count=len(profile.experience),
        expires_in="10 minutes",
        created_at=created_iso,
    )

@router.post("/connect-key", response_model=ConnectKeyResponse)
async def connect_interview_key(req: ConnectKeyRequest):
    """Flutter Mobile App connects via Access Key to start the interview immediately."""
    key = req.access_key.strip().upper()
    load_keys_from_disk()
    
    if key in interview_access_keys:
        key_record = interview_access_keys[key]
        now_ts = time.time()
        
        # Check 10-minute expiration
        expires_at_ts = key_record.get("expires_at_ts")
        if not expires_at_ts and "created_ts" in key_record:
            expires_at_ts = key_record["created_ts"] + 600
        
        if expires_at_ts and now_ts > expires_at_ts:
            del interview_access_keys[key]
            save_keys_to_disk()
            logger.warning(f"Rejected expired interview key: {key} (> 10 minutes)")
            raise HTTPException(
                status_code=410,
                detail="Interview access key has expired (10-minute limit). Please generate a fresh key from the web resume builder."
            )

        raw_p = key_record["profile"]
        raw_c = key_record["config"]
        profile: CandidateProfile = raw_p if isinstance(raw_p, CandidateProfile) else CandidateProfile(**raw_p)
        config: InterviewConfig = raw_c if isinstance(raw_c, InterviewConfig) else InterviewConfig(**raw_c)
    else:
        raise HTTPException(
            status_code=404,
            detail="Invalid interview access key. Please check the code or generate a fresh key from the web resume builder."
        )

    # 1. Create interview session
    session = interview_service.create_session(profile, config)

    # 2. Start interview and generate first question
    session, first_question = await interview_service.start_interview(session.session_id)
    audio = await tts_service.synthesize_to_base64_async(first_question)

    logger.info(f"Connected interview session {session.session_id} using key {key} for candidate {profile.personal_info.name}")

    return ConnectKeyResponse(
        status="connected",
        session=session,
        candidate=profile,
        first_question=first_question,
        audio_base64=audio,
    )

@router.get("/validate-key/{access_key}")
async def validate_interview_key(access_key: str):
    """Check if an interview key is still valid within its 10-minute window."""
    key = access_key.strip().upper()
    load_keys_from_disk()
    
    if key not in interview_access_keys:
        raise HTTPException(status_code=404, detail="Interview key not found.")
    
    key_record = interview_access_keys[key]
    now_ts = time.time()
    expires_at_ts = key_record.get("expires_at_ts")
    if not expires_at_ts and "created_ts" in key_record:
        expires_at_ts = key_record["created_ts"] + 600
    
    if expires_at_ts and now_ts > expires_at_ts:
        del interview_access_keys[key]
        save_keys_to_disk()
        raise HTTPException(status_code=410, detail="Interview access key has expired (10-minute limit).")
    
    remaining_secs = int(expires_at_ts - now_ts) if expires_at_ts else 600
    return {
        "status": "valid",
        "access_key": key,
        "remaining_seconds": max(0, remaining_secs),
        "expires_in_minutes": f"{remaining_secs // 60}m {remaining_secs % 60}s"
    }

@router.post("/upload-and-start", response_model=ConnectKeyResponse)
async def upload_resume_and_start_interview(
    file: UploadFile = File(...),
    target_role: Optional[str] = Form("Software Engineer"),
    difficulty: Optional[str] = Form("Intermediate"),
    interview_type: Optional[str] = Form("Mixed"),
):
    """Direct PDF upload from Flutter app to parse resume and start AI interview instantly."""
    filename = file.filename or "resume.pdf"
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10MB.")

    try:
        _, profile = cv_parser_service.parse_document(filename, content)
        profile = candidate_profile_service.enrich_profile(profile)

        diff = InterviewDifficulty.INTERMEDIATE
        if difficulty == "Beginner":
            diff = InterviewDifficulty.BEGINNER
        elif difficulty == "Advanced":
            diff = InterviewDifficulty.ADVANCED

        itype = InterviewType.MIXED
        if interview_type == "Technical":
            itype = InterviewType.TECHNICAL
        elif interview_type == "Behavioral":
            itype = InterviewType.BEHAVIORAL
        elif interview_type == "Project Deep Dive":
            itype = InterviewType.PROJECT_DEEP_DIVE

        config = InterviewConfig(
            target_role=target_role or "Software Engineer",
            difficulty=diff,
            interview_type=itype,
            max_questions=7,
        )

        session = interview_service.create_session(profile, config)
        session, first_question = await interview_service.start_interview(session.session_id)
        audio = await tts_service.synthesize_to_base64_async(first_question)

        return ConnectKeyResponse(
            status="connected",
            session=session,
            candidate=profile,
            first_question=first_question,
            audio_base64=audio,
        )
    except Exception as e:
        logger.error(f"Error in direct resume upload and start: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start interview from resume: {str(e)}")

class CreateSessionRequest(BaseModel):
    profile: CandidateProfile
    config: InterviewConfig

class TTSRequest(BaseModel):
    text: str

class TranscribeRequest(BaseModel):
    audio_base64: str
    filename: Optional[str] = "audio.m4a"

class StartResponse(BaseModel):
    session: InterviewSession
    first_question: str
    audio_base64: Optional[str] = None

class AnswerResponse(BaseModel):
    session: InterviewSession
    evaluation: AnswerEvaluation
    next_question: Optional[str] = None
    audio_base64: Optional[str] = None
    is_completed: bool = False

@router.post("/create", response_model=InterviewSession)
async def create_session(request: CreateSessionRequest):
    session = interview_service.create_session(request.profile, request.config)
    return session

@router.post("/{session_id}/start", response_model=StartResponse)
async def start_interview(session_id: str):
    try:
        session, question = await interview_service.start_interview(session_id)
        audio = await tts_service.synthesize_to_base64_async(question)
        return StartResponse(session=session, first_question=question, audio_base64=audio)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to start interview {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}", response_model=InterviewSession)
async def get_session(session_id: str):
    session = interview_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    return session

@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(submission: AnswerSubmission):
    answer_text = submission.answer_text.strip()
    if not answer_text and submission.audio_data_base64:
        answer_text = await stt_service.transcribe_audio_base64(submission.audio_data_base64)
    
    if not answer_text:
        raise HTTPException(status_code=400, detail="Answer text or audio is required.")

    try:
        session, eval_result, next_q = await interview_service.process_candidate_answer(
            submission.session_id, answer_text
        )
        audio = await tts_service.synthesize_to_base64_async(next_q) if next_q else None
        return AnswerResponse(
            session=session,
            evaluation=eval_result,
            next_question=next_q,
            audio_base64=audio,
            is_completed=(session.stage == "COMPLETED" or not session.is_active)
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts")
async def generate_speech(req: TTSRequest):
    audio = await tts_service.synthesize_to_base64_async(req.text)
    return {"audio_base64": audio}

@router.post("/transcribe")
async def transcribe_audio(req: TranscribeRequest):
    text = await stt_service.transcribe_audio_base64(req.audio_base64, filename=req.filename or "audio.m4a")
    return {"text": text}

@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = interview_service.get_session(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    logger.info(f"WebSocket connected for session: {session_id}")
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            action = data.get("action")

            if action == "start":
                session, q = await interview_service.start_interview(session_id)
                audio = tts_service.synthesize_to_base64(q)
                await websocket.send_json({
                    "type": "question",
                    "stage": session.stage.value,
                    "question_number": session.question_number,
                    "question": q,
                    "audio_base64": audio
                })
            elif action == "answer":
                ans = data.get("answer_text", "")
                audio_b64 = data.get("audio_base64")
                if not ans and audio_b64:
                    ans = await stt_service.transcribe_audio_base64(audio_b64)
                
                session, ev, next_q = await interview_service.process_candidate_answer(session_id, ans)
                audio = tts_service.synthesize_to_base64(next_q) if next_q else None
                
                await websocket.send_json({
                    "type": "evaluation_and_next",
                    "evaluation": ev.model_dump(),
                    "stage": session.stage.value,
                    "question_number": session.question_number,
                    "next_question": next_q,
                    "audio_base64": audio,
                    "is_completed": (session.stage == "COMPLETED")
                })
            elif action == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected from session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
