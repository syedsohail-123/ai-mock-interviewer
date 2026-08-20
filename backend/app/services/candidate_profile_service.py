from typing import Dict, Any, List
from app.schemas.cv import CandidateProfile

class CandidateProfileService:
    @staticmethod
    def get_skill_categories(profile: CandidateProfile) -> Dict[str, List[str]]:
        categories = {
            "Languages": [],
            "Frameworks": [],
            "Databases": [],
            "Cloud & DevOps": [],
            "Other": []
        }
        
        language_keywords = {"python", "javascript", "typescript", "dart", "go", "golang", "rust", "java", "c++", "c#", "sql"}
        framework_keywords = {"flutter", "react", "fastapi", "django", "flask", "node.js", "next.js", "express"}
        db_keywords = {"postgresql", "mysql", "mongodb", "redis", "elasticsearch"}
        cloud_keywords = {"docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "git"}

        for skill in profile.skills:
            sk_lower = skill.lower()
            if any(k in sk_lower for k in language_keywords):
                categories["Languages"].append(skill)
            elif any(k in sk_lower for k in framework_keywords):
                categories["Frameworks"].append(skill)
            elif any(k in sk_lower for k in db_keywords):
                categories["Databases"].append(skill)
            elif any(k in sk_lower for k in cloud_keywords):
                categories["Cloud & DevOps"].append(skill)
            else:
                categories["Other"].append(skill)
        
        return {k: v for k, v in categories.items() if v}

    @staticmethod
    def enrich_profile(profile: CandidateProfile) -> CandidateProfile:
        if not profile.summary and profile.skills:
            profile.summary = f"Experienced professional specialized in {', '.join(profile.skills[:4])}."
        return profile

candidate_profile_service = CandidateProfileService()
