import json
import re
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.schemas.cv import CandidateProfile
from app.schemas.interview import InterviewStage, InterviewConfig
from app.schemas.evaluation import AnswerEvaluation

def _clean_llm_text(text: str) -> str:
    """Filter out reasoning/thinking process tokens while preserving complete full interview questions."""
    if not text:
        return ""
    # 1. Strip complete <think>...</think> blocks
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    
    # 2. If <think> tag was not closed
    if "<think>" in cleaned:
        parts = cleaned.split("<think>")
        cleaned = parts[0].strip()

    # 3. Strip any Thinking Process / Deconstruct headers
    cleaned = re.sub(r"(?i)^(Thinking Process|Deconstruct the Input|Determine the Goal|Here is the question:?).*?\n+", "", cleaned, flags=re.DOTALL).strip()
    
    # 4. Remove preamble metadata lines
    cleaned_lines = []
    for line in cleaned.splitlines():
        l = line.strip()
        if not l:
            continue
        if l.startswith(("Role:", "Instructions:", "Difficulty:", "Skills:", "Stage:", "Candidate Name:")):
            continue
        cleaned_lines.append(l)

    final_text = " ".join(cleaned_lines).strip()
    return final_text

class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.openai_key = settings.OPENAI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.nvidia_key = settings.NVIDIA_API_KEY
        self.ollama_url = settings.OLLAMA_BASE_URL
        self.model = settings.LLM_MODEL

    async def generate_interview_question(
        self,
        candidate_profile: CandidateProfile,
        config: InterviewConfig,
        stage: InterviewStage,
        question_num: int,
        prev_question: Optional[str] = None,
        prev_answer: Optional[str] = None,
        prev_eval: Optional[Dict[str, Any]] = None,
    ) -> str:
        prompt = self._build_question_prompt(
            candidate_profile, config, stage, question_num, prev_question, prev_answer, prev_eval
        )
        
        try:
            raw_text = None
            # 1. Try NVIDIA NIM (Meta Llama 3.1 70B Instruct)
            if self.nvidia_key:
                raw_text = await self._call_nvidia(prompt)
            # 2. Try Groq
            elif self.groq_key:
                raw_text = await self._call_groq(prompt)
            # 3. Try OpenAI
            elif self.openai_key:
                raw_text = await self._call_openai(prompt)
            elif self.provider == "ollama":
                raw_text = await self._call_ollama(prompt)

            if raw_text:
                cleaned = _clean_llm_text(raw_text)
                if cleaned:
                    logger.info(f"LLM generated question ({len(cleaned)} chars): {cleaned[:80]}...")
                    return cleaned
        except Exception as e:
            logger.warning(f"LLM provider call failed ({e}). Using intelligent fallback generator.")
        
        return self._mock_question_generator(
            candidate_profile, config, stage, question_num, prev_question, prev_answer, prev_eval
        )

    async def evaluate_candidate_answer(
        self,
        question: str,
        answer: str,
        stage: InterviewStage,
        target_role: str,
        skills: list[str]
    ) -> AnswerEvaluation:
        prompt = self._build_evaluation_prompt(question, answer, stage, target_role, skills)
        
        try:
            response_text = None
            if self.nvidia_key:
                response_text = await self._call_nvidia(prompt)
            elif self.groq_key:
                response_text = await self._call_groq(prompt)
            elif self.openai_key:
                response_text = await self._call_openai(prompt)
            elif self.provider == "ollama":
                response_text = await self._call_ollama(prompt)

            if response_text:
                return self._parse_evaluation_json(response_text, question, answer)
        except Exception as e:
            logger.warning(f"LLM evaluation provider failed ({e}). Using rule-based fallback evaluator.")
        
        return self._mock_evaluator(question, answer, stage)

    def _build_question_prompt(
        self,
        candidate: CandidateProfile,
        config: InterviewConfig,
        stage: InterviewStage,
        question_num: int,
        prev_q: Optional[str] = None,
        prev_a: Optional[str] = None,
        prev_eval: Optional[Dict[str, Any]] = None
    ) -> str:
        skills_str = ", ".join(candidate.skills[:6])
        projects_str = "; ".join([f"{p.title}: {p.description}" for p in candidate.projects[:2]])
        
        has_prev_answer = bool(prev_a and prev_a.strip() and prev_a != 'N/A')
        
        cross_examination_block = ""
        if has_prev_answer:
            cross_examination_block = f"""
MANDATORY CROSS-EXAMINATION & INTERRUPTIVE FOLLOW-UP:
The candidate just gave this response: "{prev_a}" to the question: "{prev_q}".

You MUST challenge and cross-examine them on the specific features, choices, and technologies they just mentioned:
1. Start directly by citing what they said: e.g. "You mentioned that you used [feature/technology]..."
2. Ask "Why did you use this specific feature or architecture instead of alternatives?"
3. Ask "Why did you add this feature, and what trade-offs, bottlenecks, or failure scenarios did you consider?"
4. Do NOT ask a detached generic question. Your question MUST be an immediate, sharp cross-examination drill-down into their exact claims.
"""
        else:
            cross_examination_block = f"""
PRIMARY TASK:
Welcome {candidate.personal_info.name} and ask an introductory question exploring their background and passion for the {config.target_role} role.
"""

        return f"""
You are a senior tech lead conducting an interactive mock interview for a {config.target_role} position.
Candidate Name: {candidate.personal_info.name}
Experience Level: {config.experience_level}
Difficulty: {config.difficulty.value}
Skills: {skills_str}
Projects: {projects_str}
Current Stage: {stage.value}
Question #{question_num} of {config.max_questions}

{cross_examination_block}

CRITICAL RULES:
- You must output ONLY the spoken interview question directed to {candidate.personal_info.name}.
- Do NOT output any internal thoughts, reasoning steps, bullet lists, or <think> tags.
- Begin immediately with the exact question text.
"""

    def _build_evaluation_prompt(
        self, question: str, answer: str, stage: InterviewStage, role: str, skills: list[str]
    ) -> str:
        return f"""
Evaluate the candidate's response in a mock interview.
Target Role: {role}
Stage: {stage.value}
Question: {question}
Candidate Answer: {answer}
Relevant Skills: {', '.join(skills[:5])}

Respond ONLY with a valid JSON object matching this schema:
{{
  "technical_score": <float 0.0 - 10.0>,
  "communication_score": <float 0.0 - 10.0>,
  "clarity_score": <float 0.0 - 10.0>,
  "depth_score": <float 0.0 - 10.0>,
  "problem_solving_score": <float 0.0 - 10.0>,
  "correctness_score": <float 0.0 - 10.0>,
  "overall_score": <float 0.0 - 10.0>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>"],
  "follow_up_required": <true/false>,
  "follow_up_reason": "<optional reason>",
  "improvement_feedback": "<actionable advice>"
}}
"""

    def _parse_evaluation_json(self, raw_text: str, question: str, answer: str) -> AnswerEvaluation:
        try:
            cleaned = raw_text.strip()
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                return AnswerEvaluation(
                    question_number=1,
                    question_text=question,
                    answer_text=answer,
                    technical_score=float(data.get("technical_score", 7.0)),
                    communication_score=float(data.get("communication_score", 7.0)),
                    clarity_score=float(data.get("clarity_score", 7.0)),
                    depth_score=float(data.get("depth_score", 7.0)),
                    problem_solving_score=float(data.get("problem_solving_score", 7.0)),
                    correctness_score=float(data.get("correctness_score", 7.0)),
                    overall_score=float(data.get("overall_score", 7.0)),
                    strengths=data.get("strengths", ["Clear explanation"]),
                    weaknesses=data.get("weaknesses", []),
                    follow_up_required=bool(data.get("follow_up_required", False)),
                    follow_up_reason=data.get("follow_up_reason"),
                    improvement_feedback=data.get("improvement_feedback", "Solid answer.")
                )
        except Exception as e:
            logger.warning(f"Error parsing LLM evaluation JSON: {e}. Falling back to rule-based evaluation.")
        return self._mock_evaluator(question, answer, InterviewStage.TECHNICAL)

    async def _call_nvidia(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.nvidia_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.NVIDIA_MODEL or "meta/llama-3.1-70b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.6,
            "max_tokens": 800
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(
                f"{settings.NVIDIA_BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"].strip()

    async def _call_openai(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.openai_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7
                }
            )
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"].strip()

    async def _call_groq(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.groq_key}"},
                json={
                    "model": self.model or "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5,
                    "max_tokens": 400
                }
            )
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"].strip()

    async def _call_ollama(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                f"{self.ollama_url}/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False}
            )
            res.raise_for_status()
            return res.json().get("response", "").strip()

    def _mock_question_generator(
        self,
        candidate: CandidateProfile,
        config: InterviewConfig,
        stage: InterviewStage,
        question_num: int,
        prev_q: Optional[str],
        prev_a: Optional[str],
        prev_e: Optional[Dict[str, Any]]
    ) -> str:
        role = config.target_role or "Software Engineer"
        skill_1 = candidate.skills[0] if candidate.skills else "System Architecture"
        skill_2 = candidate.skills[1] if len(candidate.skills) > 1 else "Database Optimization"
        proj = candidate.projects[0].title if candidate.projects else "your recent production system"
        role_lower = role.lower()

        # Dynamic Cross-Examination from candidate's exact words
        if prev_a and len(prev_a.strip().split()) >= 4:
            words = prev_a.strip().split()
            sample = " ".join(words[:14])
            if stage in [InterviewStage.TECHNICAL, InterviewStage.PROJECT_DEEP_DIVE, InterviewStage.PROBLEM_SOLVING]:
                return f"You mentioned that you implemented '{sample}...'. Why did you choose this specific feature or design over other alternatives, and what trade-offs did you face?"

        # Adaptive follow-up check for very short responses
        if prev_a and len(prev_a.strip().split()) < 4 and prev_q:
            return f"Could you elaborate more on the specific technical decisions and trade-offs you made regarding {skill_1}?"

        if stage == InterviewStage.INTRO:
            return f"Welcome {candidate.personal_info.name}! To begin our interview for the {role} position, could you walk me through your technical background and what makes you excited about this role?"

        elif stage == InterviewStage.BACKGROUND:
            return f"I see strong experience with {skill_1} in your profile. How have you applied {skill_1} in your previous projects to solve complex problems as a {role}?"

        elif stage == InterviewStage.TECHNICAL:
            if any(k in role_lower for k in ["devops", "cloud", "sre", "platform", "infrastructure"]):
                return f"In your role as a {role}, how do you architect resilient GitOps deployment pipelines, container orchestration with Kubernetes, and observability using {skill_1} and {skill_2}?"
            elif any(k in role_lower for k in ["flutter", "mobile", "ios", "android"]):
                return f"As a {role}, how do you structure reactive state management (such as BLoC or Riverpod) and optimize widget rendering performance when integrating REST/WebSocket APIs with {skill_1}?"
            elif any(k in role_lower for k in ["frontend", "react", "next", "vue", "ui"]):
                return f"For a {role}, how do you ensure high frontend rendering performance, state isolation, and responsive UI architecture using {skill_1} and {skill_2}?"
            elif any(k in role_lower for k in ["data", "ml", "ai", "machine learning", "analytics"]):
                return f"As a {role}, how do you design fault-tolerant data pipelines and handle real-time streaming, transformation, and model inference with {skill_1} and {skill_2}?"
            else:
                return f"In your capacity as a {role}, how do you design scalable backend microservices, manage database concurrency, and ensure system fault tolerance using {skill_1} and {skill_2}?"

        elif stage == InterviewStage.PROJECT_DEEP_DIVE:
            return f"Looking at your project '{proj}', what was the most demanding architectural or technical challenge you faced, and how did you resolve it as a {role}?"

        elif stage == InterviewStage.PROBLEM_SOLVING:
            if any(k in role_lower for k in ["devops", "cloud", "sre", "platform"]):
                return "Suppose your Kubernetes cluster experiences sudden pod evictions and 504 gateway timeouts during a traffic surge. Walk me through your step-by-step triage, remediation, and root cause analysis."
            elif any(k in role_lower for k in ["flutter", "mobile", "ios", "android"]):
                return "Suppose your mobile app experiences UI stutter and memory bloat during continuous image caching and screen transitions. How would you profile and fix the bottleneck?"
            else:
                return "Suppose a critical production service experiences elevated query latency and high CPU utilization under peak load. What is your systematic diagnostic and mitigation strategy?"

        elif stage == InterviewStage.BEHAVIORAL:
            return f"Tell me about a time you had to make a critical technical trade-off or resolve an architectural disagreement with teammates on a {role} project. How did you lead to a successful outcome?"

        elif stage == InterviewStage.FINAL:
            return f"We've covered great technical depth today for the {role} position. Do you have any questions for me about our engineering practices or system architecture?"

        else:
            return f"Can you detail your experience delivering reliable, high-impact solutions as a {role}?"

    def _mock_evaluator(self, question: str, answer: str, stage: InterviewStage) -> AnswerEvaluation:
        words = answer.strip().split()
        word_count = len(words)

        if word_count < 10:
            tech = 5.0
            comm = 4.5
            clarity = 5.0
            depth = 4.0
            ps = 5.0
            correct = 5.0
            overall = 4.7
            strengths = ["Responded concisely"]
            weaknesses = ["Answer lacks depth and concrete technical detail", "Missing specific examples or metrics"]
            follow_up = True
            reason = "Response was very brief; requires more technical depth."
            feedback = "Expand your response with specific architectural patterns, real examples, or performance metrics."
        elif word_count < 35:
            tech = 7.5
            comm = 7.5
            clarity = 7.5
            depth = 6.5
            ps = 7.0
            correct = 7.5
            overall = 7.2
            strengths = ["Direct answer to the core question", "Good foundational concepts mentioned"]
            weaknesses = ["Could include deeper discussion of trade-offs and edge cases"]
            follow_up = False
            reason = None
            feedback = "Great clarity. Consider incorporating trade-offs, scaling limits, or alternatives considered."
        else:
            tech = 8.8
            comm = 8.5
            clarity = 8.7
            depth = 8.6
            ps = 8.5
            correct = 8.8
            overall = 8.6
            strengths = ["Strong structured explanation", "Demonstrated clear technical maturity", "Good communication of design context"]
            weaknesses = []
            follow_up = False
            reason = None
            feedback = "Excellent in-depth response with sound reasoning and technical accuracy."

        return AnswerEvaluation(
            question_number=1,
            question_text=question,
            answer_text=answer,
            technical_score=tech,
            communication_score=comm,
            clarity_score=clarity,
            depth_score=depth,
            problem_solving_score=ps,
            correctness_score=correct,
            overall_score=overall,
            strengths=strengths,
            weaknesses=weaknesses,
            follow_up_required=follow_up,
            follow_up_reason=reason,
            improvement_feedback=feedback
        )

llm_service = LLMService()
