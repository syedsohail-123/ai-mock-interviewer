import math
from typing import List

class SemanticEmbeddingService:
    @staticmethod
    def calculate_text_similarity(text1: str, text2: str) -> float:
        # Fast native token-based cosine similarity (zero overhead, fully deterministic)
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        score = len(intersection) / (math.sqrt(len(words1)) * math.sqrt(len(words2)))
        return min(1.0, score * 1.5)

    @staticmethod
    def compute_job_match_score(candidate_skills: List[str], target_role: str) -> float:
        role_tokens = target_role.lower().split()
        matched = 0
        for skill in candidate_skills:
            if any(t in skill.lower() for t in role_tokens):
                matched += 1
        base_score = 70.0 + min(30.0, len(candidate_skills) * 3.5 + matched * 5.0)
        return min(98.0, base_score)

semantic_service = SemanticEmbeddingService()
