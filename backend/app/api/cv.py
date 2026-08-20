from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.cv import CandidateProfile
from app.services.cv_parser_service import cv_parser_service
from app.services.candidate_profile_service import candidate_profile_service
from app.core.logging import logger

router = APIRouter(prefix="/cv", tags=["CV"])

@router.post("/upload", response_model=CandidateProfile)
async def upload_and_parse_cv(file: UploadFile = File(...)):
    filename = file.filename or "cv.pdf"
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 10MB.")

    try:
        raw_text, profile = cv_parser_service.parse_document(filename, content)
        profile = candidate_profile_service.enrich_profile(profile)
        logger.info(f"Successfully parsed CV for candidate: {profile.personal_info.name}")
        return profile
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error parsing CV: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

@router.post("/profile", response_model=CandidateProfile)
async def update_profile(profile: CandidateProfile):
    return candidate_profile_service.enrich_profile(profile)
