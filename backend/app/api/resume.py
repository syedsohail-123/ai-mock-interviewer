from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import datetime
import httpx
from app.core.config import settings

router = APIRouter(prefix="/resumes", tags=["ATS Resumes"])

class ResumePayload(BaseModel):
    id: Optional[str] = None
    title: str = "My Resume"
    basics: Dict[str, Any]
    sections: Dict[str, Any]
    metadata: Dict[str, Any]

# In-memory / DB fallback store
resumes_db: Dict[str, Dict[str, Any]] = {}

def get_supabase_headers():
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

@router.get("/")
async def list_resumes():
    """List all saved resumes from Supabase table."""
    if settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/resumes?select=*&order=updated_at.desc",
                    headers=get_supabase_headers(),
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
    return list(resumes_db.values())

@router.get("/{resume_id}")
async def get_resume(resume_id: str):
    """Fetch single resume by ID from Supabase."""
    if settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/resumes?id=eq.{resume_id}&select=*",
                    headers=get_supabase_headers(),
                )
                if res.status_code == 200 and res.json():
                    return res.json()[0]
        except Exception:
            pass

    if resume_id in resumes_db:
        return resumes_db[resume_id]
    raise HTTPException(status_code=404, detail="Resume not found")

@router.post("/")
async def create_or_update_resume(resume: ResumePayload):
    """Save or update resume data in Supabase resumes table."""
    resume_id = resume.id or f"res_{int(datetime.datetime.now().timestamp())}"
    data = resume.model_dump()
    data["id"] = resume_id
    data["updated_at"] = datetime.datetime.utcnow().isoformat()

    # Save to Supabase table
    if settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                headers = get_supabase_headers()
                headers["Prefer"] = "resolution=merge-duplicates"
                await client.post(
                    f"{settings.SUPABASE_URL}/rest/v1/resumes",
                    headers=headers,
                    json={
                        "id": resume_id,
                        "title": data.get("title", "Untitled Resume"),
                        "template": data.get("template", "devops"),
                        "basics": data.get("basics", {}),
                        "sections": data.get("sections", {}),
                        "metadata": data.get("metadata", {}),
                        "updated_at": data["updated_at"],
                    },
                )
        except Exception as e:
            print("Supabase save error:", e)

    resumes_db[resume_id] = data
    return {"status": "success", "id": resume_id, "data": data}

@router.delete("/{resume_id}")
async def delete_resume(resume_id: str):
    """Delete a resume by ID from Supabase."""
    if settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                await client.delete(
                    f"{settings.SUPABASE_URL}/rest/v1/resumes?id=eq.{resume_id}",
                    headers=get_supabase_headers(),
                )
        except Exception:
            pass

    if resume_id in resumes_db:
        del resumes_db[resume_id]
        return {"status": "deleted", "id": resume_id}
    return {"status": "deleted", "id": resume_id}

class SuggestExperiencePayload(BaseModel):
    role: str
    company: Optional[str] = ""
    current_description: Optional[str] = ""
    skills: Optional[List[str]] = []

class SuggestSummaryPayload(BaseModel):
    name: Optional[str] = ""
    headline: Optional[str] = ""
    experience_titles: Optional[List[str]] = []
    skills: Optional[List[str]] = []

@router.post("/suggest/experience")
async def suggest_experience_bullets(payload: SuggestExperiencePayload):
    """Generate high-impact ATS single-line bullet points tailored to seniority level."""
    role_lower = payload.role.lower()

    # Determine count and tone based on seniority level
    if any(k in role_lower for k in ["lead", "principal", "staff", "head", "director", "manager", "architect"]):
        target_count = 5
        level_guidance = "Senior/Lead level: emphasize architecture leadership, team mentorship, strategic delivery, and large-scale impact."
    elif any(k in role_lower for k in ["senior", "sr", "mid", "experienced", "specialist"]):
        target_count = 4
        level_guidance = "Mid/Senior level: emphasize full lifecycle ownership, performance optimization, and cross-functional feature delivery."
    elif any(k in role_lower for k in ["junior", "jr", "associate"]):
        target_count = 4
        level_guidance = "Junior level: emphasize technical implementation, bug fixes, feature collaboration, and learning velocity."
    else:  # Fresher / Intern / Entry
        target_count = 3
        level_guidance = "Fresher/Entry level: emphasize core programming, project execution, academic/internship work, and eager problem solving."

    prompt = f"""You are an elite ATS resume writer and recruiter.
Generate EXACTLY {target_count} concise, single-line bullet points for this work experience:
Role / Job Title: {payload.role}
Company: {payload.company or 'Tech Company'}
Existing details (if any): {payload.current_description}
Key Skills: {', '.join(payload.skills) if payload.skills else 'Software Development'}
Guidance: {level_guidance}

CRITICAL RULES:
- Each bullet MUST be a SINGLE, CONCISE line (maximum 14-18 words per bullet).
- Start each bullet with a strong action verb (e.g. Built, Optimized, Spearheaded, Implemented, Engineered, Designed).
- Include realistic quantified impact (e.g., by 30%, 10K+ users, 99.9% uptime).
- Do NOT include bullet symbols like '•' or '-' inside strings.
- Return ONLY a valid JSON list of {target_count} strings: ["bullet 1", "bullet 2", ...]"""
    
    # 1. NVIDIA AI Provider
    if settings.NVIDIA_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{settings.NVIDIA_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.NVIDIA_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are a professional ATS resume optimizer. Respond only with valid JSON array of strings."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 350,
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"].strip()
                    import json, re
                    clean_content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                    match = re.search(r'\[.*\]', clean_content, re.DOTALL)
                    if match:
                        return {"status": "success", "bullets": json.loads(match.group(0)), "provider": "nvidia"}
        except Exception:
            pass

    # 2. High-quality fallback suggestions
    fallback_bullets = [
        f"Spearheaded core feature architecture and delivery for {payload.role}, reducing production latency and bugs by 35%.",
        f"Optimized system performance and database queries, accelerating endpoint response times by 40%.",
        f"Collaborated cross-functionally with product and engineering teams to deploy automated continuous delivery pipelines.",
        f"Engineered scalable, fault-tolerant solutions supporting high-traffic production workloads with 99.99% uptime."
    ]
    return {"status": "success", "bullets": fallback_bullets, "provider": "fallback"}

class SuggestSummaryPayload(BaseModel):
    name: Optional[str] = ""
    headline: Optional[str] = ""
    job_title: Optional[str] = ""
    experience_level: Optional[str] = "mid"
    experience_titles: Optional[List[str]] = []
    skills: Optional[List[str]] = []

@router.post("/suggest/summary")
async def suggest_summary(payload: SuggestSummaryPayload):
    """Generate professional summary variations based on job title and skills."""
    target_role = payload.job_title or payload.headline or "Software Professional"
    skills_text = ", ".join(payload.skills[:6]) if payload.skills else "Modern Software Engineering & Agile Delivery"
    
    prompt = f"""You are an elite ATS resume writer and executive recruiter.
Generate 3 distinct, high-impact Professional Summary options for a candidate with Job Title / Target Role: '{target_role}'.
Candidate Skills: {skills_text}

Provide 3 variations:
1. Impact & Performance-Driven: Highlighting metrics, efficiency, and scalable delivery.
2. Deep Technical Specialist: Emphasizing technical mastery, system design, and robust architecture.
3. Leadership & Collaborative: Highlighting cross-functional execution, project leadership, and business value.

Rules:
- Each summary must be 2 to 3 concise, punchy sentences (40-60 words max).
- Include strong industry keywords for ATS algorithms.
- Return ONLY a valid JSON list of 3 strings: ["summary 1", "summary 2", "summary 3"]"""

    # 1. NVIDIA AI Provider
    if settings.NVIDIA_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{settings.NVIDIA_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.NVIDIA_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are a professional ATS resume optimizer. Respond only with valid JSON array of strings."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.4,
                        "max_tokens": 400,
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"].strip()
                    import json, re
                    clean_content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                    match = re.search(r'\[.*\]', clean_content, re.DOTALL)
                    if match:
                        return {"status": "success", "summaries": json.loads(match.group(0)), "provider": "nvidia"}
        except Exception:
            pass

    fallback_summaries = [
        f"Results-driven {target_role} with proven expertise in {skills_text}. Adept at designing scalable architecture, driving cross-functional alignment, and delivering high-impact production solutions.",
        f"Innovative {target_role} passionate about building high-performance systems and clean code. Demonstrated track record in scaling infrastructure, streamlining workflows, and improving developer productivity.",
        f"High-impact {target_role} experienced in full lifecycle engineering, continuous delivery, and distributed systems with a continuous focus on quality, reliability, and business impact."
    ]
    return {"status": "success", "summaries": fallback_summaries, "provider": "fallback"}


import io
import base64
import pdfplumber
import docx

import re

def build_structured_resume_data(text: str) -> dict:
    """Parse raw CV text into full ResumeData structure with clean separation of fields."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # 1. Header basics
    name = "Candidate"
    headline = "Software Engineer"
    email = ""
    phone = ""
    location = "Remote"
    linkedin = ""
    github = ""
    portfolio = ""

    # Find email
    email_m = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    if email_m:
        email = email_m.group(0)

    # Find phone
    phone_m = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b", text)
    if phone_m:
        phone = phone_m.group(0).strip()

    # Find links
    li_m = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+", text, re.IGNORECASE)
    if li_m:
        linkedin = li_m.group(0)

    gh_m = re.search(r"(?:https?://)?(?:www\.)?github\.com/[\w-]+", text, re.IGNORECASE)
    if gh_m:
        github = gh_m.group(0)

    port_m = re.search(r"(?:https?://)?(?:www\.)?[\w-]+\.(?:vercel\.app|netlify\.app|dev|io|me|com)(?:/[\w-]*)?", text, re.IGNORECASE)
    if port_m and "linkedin" not in port_m.group(0) and "github" not in port_m.group(0) and "gmail" not in port_m.group(0):
        portfolio = port_m.group(0)

    # Find Name & Headline from top 5 lines
    for line in lines[:4]:
        clean_l = re.sub(r"[•·|,\t]", " ", line).strip()
        if "@" not in clean_l and not re.search(r"\d{5,}", clean_l) and not any(k in clean_l.lower() for k in ["summary", "experience", "skills", "education", "http"]):
            if name == "Candidate" and len(clean_l.split()) in [2, 3, 4]:
                name = clean_l
            elif headline == "Software Engineer" and any(k in clean_l.lower() for k in ["developer", "engineer", "architect", "lead", "specialist", "devops", "full-stack", "frontend", "backend", "cloud", "ai", "product"]):
                headline = clean_l

    # Extract clean location (City, Country) without email/phone strings
    for line in lines[:10]:
        parts = re.split(r"[·|•\t,]+", line)
        for p in parts:
            p_clean = p.strip()
            if not p_clean or "@" in p_clean or re.search(r"\d{5,}", p_clean):
                continue
            if any(w in p_clean.lower() for w in ["hyderabad", "bangalore", "bengaluru", "mumbai", "delhi", "pune", "chennai", "india", "usa", "san francisco", "california", "new york", "london", "remote", "onsite", "hybrid"]):
                # Clean out any leftover noise
                location = re.sub(r"[()·|•]", "", p_clean).strip()
                break
        if location != "Remote":
            break

    # 2. Professional Summary
    summary = ""
    sum_m = re.search(r"(?:professional summary|summary|about me|profile)[:\n\s]+(.*?)(?=\n\s*(?:experience|work experience|employment|key project|projects|skills|technical skills|education|\Z))", text, re.IGNORECASE | re.DOTALL)
    if sum_m:
        raw_s = sum_m.group(1).strip()
        summary = " ".join([l.strip() for l in raw_s.split("\n") if l.strip()])
    else:
        for l in lines[2:8]:
            if len(l) > 60 and "@" not in l and not l.startswith("•") and not l.startswith("►") and not l.startswith("-"):
                summary = l
                break

    # 3. Work Experience
    exp_items = []
    exp_m = re.search(r"(?:experience|work experience|employment)[:\n\s]+(.*?)(?=\n\s*(?:key project|projects|technical skills|skills|education|certifications|\Z))", text, re.IGNORECASE | re.DOTALL)
    if exp_m:
        exp_text = exp_m.group(1)
        exp_lines = [l.strip() for l in exp_text.split("\n") if l.strip()]
        curr_exp = None
        
        for el in exp_lines:
            # Bullet marker detection
            is_bullet_char = bool(re.search(r"^[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f\-\*\u2013\u2014►▶▸•>·]", el))
            has_embedded_bullets = bool(re.search(r"[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f►▶▸•]", el))
            
            # Comprehensive date pattern matching (e.g. 'March 26- May 26', 'Jan 25-jan26', 'Mar 2026 – Jun 2026')
            date_m = re.search(r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})\s*'?\d{0,4}\s*[-–—/to\s]+\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4}|\d{2}|Present|Current|Ongoing)\s*'?\d{0,4}", el, re.IGNORECASE)
            
            # A true role header MUST have a role keyword AND either a delimiter (·, |, at, -) or a date range
            has_role_keyword = any(k in el.lower() for k in ["developer", "engineer", "intern", "lead", "architect", "manager", "specialist", "consultant", "analyst"])
            has_delimiter = any(d in el for d in ["·", "|", " at "]) or (date_m is not None)
            
            is_role_header = not is_bullet_char and has_role_keyword and has_delimiter and not el.lower().startswith(("designed", "built", "engineered", "deployed", "developed", "implemented", "created", "spearheaded", "optimized", "managed", "led", "ingests", "real-time", "stack:"))
            
            if is_role_header:
                if curr_exp:
                    exp_items.append(curr_exp)
                
                date_str = date_m.group(0).strip() if date_m else ""
                clean_header_line = re.sub(re.escape(date_str), "", el, flags=re.IGNORECASE).strip(" ·-–—,|") if date_str else el
                
                parts = [p.strip() for p in re.split(r"[·|•\t]|(\s+[-–—]\s+)|\s+at\s+", clean_header_line) if p and p.strip() and p.strip() not in ["-", "–", "—", "at"]]
                
                role = parts[0] if len(parts) > 0 else "Software Engineer"
                company = parts[1] if len(parts) > 1 else ""

                exp_loc = ""
                for p in parts[1:]:
                    if any(w in p.lower() for w in ["onsite", "hybrid", "remote", "hyderabad", "bangalore", "vizag", "india", "usa"]):
                        exp_loc = p.strip()
                        break

                curr_exp = {
                    "id": f"exp-{len(exp_items) + 1}",
                    "title": role or "Software Engineer",
                    "subtitle": company or "Technology Solutions",
                    "date": date_str or "Recent",
                    "location": exp_loc or location,
                    "description": ""
                }
            elif curr_exp:
                if has_embedded_bullets:
                    sub_parts = [p.strip() for p in re.split(r"[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f►▶▸•]", el) if p.strip()]
                    for sp in sub_parts:
                        clean_sp = re.sub(r"^[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f\-\*\u2013\u2014►▶▸•>·\s]+", "", sp).strip()
                        if clean_sp:
                            curr_exp["description"] += f"\n• {clean_sp}" if curr_exp["description"] else f"• {clean_sp}"
                else:
                    clean_line = re.sub(r"^[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f\-\*\u2013\u2014►▶▸•>·\s]+", "", el).strip()
                    if clean_line:
                        if is_bullet_char:
                            curr_exp["description"] += f"\n• {clean_line}" if curr_exp["description"] else f"• {clean_line}"
                        else:
                            curr_exp["description"] += f" {clean_line}"
        
        if curr_exp:
            exp_items.append(curr_exp)

    # 4. Key Projects
    proj_items = []
    proj_m = re.search(r"(?:key project|projects|project)[:\n\s]+(.*?)(?=\n\s*(?:technical skills|skills|education|certifications|\Z))", text, re.IGNORECASE | re.DOTALL)
    if proj_m:
        proj_text = proj_m.group(1)
        p_lines = [l.strip() for l in proj_text.split("\n") if l.strip()]
        curr_proj = None
        
        for pl in p_lines:
            is_bullet_char = bool(re.search(r"^[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f\-\*\u2013\u2014►▶▸•>·]", pl))
            has_embedded_bullets = bool(re.search(r"[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f►▶▸•]", pl))
            date_m = re.search(r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4})\s*'?\d{0,4}\s*[-–—/to\s]+\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{4}|\d{2}|Present|Current|Ongoing)\s*'?\d{0,4}", pl, re.IGNORECASE)
            
            is_stack_line = pl.lower().startswith("stack:") or pl.lower().startswith("tech:")
            is_proj_header = not is_bullet_char and not is_stack_line and (
                (date_m is not None) or 
                ("·" in pl and any(k in pl.lower() for k in ["project", "analyzer", "platform", "system", "app", "dashboard", "engine", "service"]))
            )
            
            if is_proj_header:
                if curr_proj:
                    proj_items.append(curr_proj)
                
                p_date = date_m.group(0).strip() if date_m else "Recent"
                clean_p_line = re.sub(re.escape(p_date), "", pl, flags=re.IGNORECASE).strip(" ·-–—,|") if date_m else pl
                
                parts = [p.strip() for p in re.split(r"[·|•\t]|(\s+[-–—]\s+)", clean_p_line) if p and p.strip() and p.strip() not in ["-", "–", "—"]]
                p_title = parts[0] if parts else clean_p_line
                p_subtitle = parts[1] if len(parts) > 1 else "Personal Project"

                curr_proj = {
                    "id": f"proj-{len(proj_items) + 1}",
                    "title": p_title,
                    "subtitle": p_subtitle,
                    "date": p_date,
                    "description": "",
                    "tags": ["React", "Next.js", "TypeScript", "Tailwind CSS", "Python", "FastAPI", "WebSockets", "LLMs"]
                }
            elif curr_proj and is_stack_line:
                tech_str = pl.split(":", 1)[1]
                curr_proj["tags"] = [t.strip() for t in re.split(r"[,|·•/]", tech_str) if t.strip()]
            elif curr_proj:
                if has_embedded_bullets:
                    sub_parts = [p.strip() for p in re.split(r"[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f►▶▸•]", pl) if p.strip()]
                    for sp in sub_parts:
                        clean_sp = re.sub(r"^[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f\-\*\u2013\u2014►▶▸•>·\s]+", "", sp).strip()
                        if clean_sp:
                            curr_proj["description"] += f"\n• {clean_sp}" if curr_proj["description"] else f"• {clean_sp}"
                else:
                    clean_line = re.sub(r"^[\u2022\u25ba\u25b6\u25c4\u25aa\u2023\u2043\u25cf\u25e6\u2219\u223f\-\*\u2013\u2014►▶▸•>·\s]+", "", pl).strip()
                    if clean_line:
                        if is_bullet_char:
                            curr_proj["description"] += f"\n• {clean_line}" if curr_proj["description"] else f"• {clean_line}"
                        else:
                            curr_proj["description"] += f" {clean_line}"
                    
        if curr_proj:
            proj_items.append(curr_proj)

    # 5. Technical Skills Categorization
    skill_items = []
    skills_m = re.search(r"(?:technical skills|skills)[:\n\s]+(.*?)(?=\n\s*(?:education|certifications|projects|\Z))", text, re.IGNORECASE | re.DOTALL)
    if skills_m:
        s_text = skills_m.group(1)
        s_lines = [l.strip() for l in s_text.split("\n") if l.strip()]
        for idx, sl in enumerate(s_lines):
            if ":" in sl:
                cat_name, tags_str = sl.split(":", 1)
                tags = [t.strip() for t in re.split(r"[,|·•/]", tags_str) if t.strip()]
                if tags:
                    skill_items.append({
                        "id": f"sk-{idx + 1}",
                        "title": re.sub(r"^[•►\-\*\s]+", "", cat_name).strip(),
                        "tags": tags
                    })
    if not skill_items:
        skill_items = [
            {"id": "sk-1", "title": "Languages & Frameworks", "tags": ["Python", "JavaScript", "TypeScript", "React", "Next.js", "FastAPI"]},
            {"id": "sk-2", "title": "Cloud & DevOps", "tags": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"]},
            {"id": "sk-3", "title": "Databases & AI", "tags": ["PostgreSQL", "MongoDB", "Redis", "OpenAI API", "LLMs"]}
        ]

    # 6. Education
    edu_items = []
    edu_m = re.search(r"(?:education|academics)[:\n\s]+(.*?)(?=\n\s*(?:certifications|skills|projects|\Z))", text, re.IGNORECASE | re.DOTALL)
    if edu_m:
        e_text = edu_m.group(1)
        e_lines = [l.strip() for l in e_text.split("\n") if l.strip()]
        for idx, el in enumerate(e_lines[:2]):
            parts = [p.strip() for p in re.split(r"[·|•\t]|(\s+[-–—]\s+)", el) if p and p.strip() and p.strip() not in ["-", "–", "—"]]
            degree = parts[0] if len(parts) > 0 else el
            inst = parts[1] if len(parts) > 1 else "University"
            date_str = ""
            date_m = re.search(r"(?:Jul|Aug|Jun|May|\d{4})\s*\d{4}", el, re.IGNORECASE)
            if date_m:
                date_str = date_m.group(0)

            edu_items.append({
                "id": f"edu-{idx + 1}",
                "title": degree,
                "subtitle": inst,
                "date": date_str or "Graduated"
            })
    if not edu_items:
        edu_items = [{"id": "edu-1", "title": "B.E. in Engineering", "subtitle": "Osmania University", "date": "Graduated"}]

    # 7. Certifications
    cert_items = []
    certs_m = re.search(r"(?:certifications|certificates)[:\n\s]+(.*?)(?=\n\s*(?:education|skills|\Z))", text, re.IGNORECASE | re.DOTALL)
    if certs_m:
        c_text = certs_m.group(1)
        c_lines = [l.strip() for l in c_text.split("\n") if l.strip()]
        for idx, cl in enumerate(c_lines[:4]):
            clean_c = re.sub(r"^[•►\-\*\s]+", "", cl).strip()
            if clean_c:
                cert_items.append({
                    "id": f"cert-{idx + 1}",
                    "title": clean_c,
                    "date": "Verified"
                })

    resume_id = f"res-{int(datetime.datetime.now().timestamp())}"
    return {
        "id": resume_id,
        "title": f"{name}'s Resume",
        "basics": {
            "name": name,
            "headline": headline,
            "email": email,
            "phone": phone,
            "location": location,
            "website": portfolio or linkedin,
            "portfolioUrl": portfolio,
            "linkedin": linkedin,
            "github": github,
            "photoUrl": "",
            "summary": summary or "Experienced software professional with proven technical track record.",
        },
        "sections": {
            "summary": { "id": "summary", "title": "Professional Summary", "type": "custom", "visible": True, "items": [] },
            "experience": { "id": "experience", "title": "Work Experience", "type": "experience", "visible": True, "items": exp_items },
            "skills": { "id": "skills", "title": "Technical Skills", "type": "skills", "visible": True, "items": skill_items },
            "projects": { "id": "projects", "title": "Key Projects", "type": "projects", "visible": True, "items": proj_items },
            "education": { "id": "education", "title": "Education", "type": "education", "visible": True, "items": edu_items },
            "certifications": { "id": "certifications", "title": "Certifications", "type": "certifications", "visible": True, "items": cert_items }
        },
        "metadata": {
            "colors": { "primary": "#0ea5e9", "background": "#ffffff", "text": "#0f172a", "sidebar": "#f8fafc", "sidebarText": "#0f172a" },
            "typography": { "headingSize": 14, "bodySize": 10, "fontFamily": "Inter" },
            "page": { "size": "A4", "sidebarWidth": 30, "hideIcons": False, "hideLinkUnderline": False },
            "layout": { "sidebar": ["skills", "education", "certifications"], "main": ["summary", "experience", "projects"] }
        }
    }


@router.post("/parse-original")
async def parse_original_document(file: UploadFile = File(...)):
    """Extract uploaded PDF or DOCX resume into structured ResumeData and visual pages."""
    filename = (file.filename or "").lower()
    content = await file.read()
    
    pages_data = []
    full_text = ""
    
    if filename.endswith(".pdf"):
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    page_w = float(page.width)
                    page_h = float(page.height)
                    
                    page_t = page.extract_text() or ""
                    if page_t:
                        full_text += f"\n{page_t}"

                    words = page.extract_words(extra_attrs=["fontname", "size"])
                    extracted_elements = []
                    
                    if not words:
                        lines_text = [l.strip() for l in page_t.split("\n") if l.strip()]
                        curr_y = 40.0
                        for l_idx, lt in enumerate(lines_text):
                            is_heading = len(lt) < 45 and not lt.startswith("•") and not lt.startswith("-")
                            size = 14.0 if is_heading else 10.5
                            extracted_elements.append({
                                "id": f"elem-{page_idx}-{l_idx}",
                                "text": lt,
                                "x": 40.0,
                                "y": round(curr_y, 1),
                                "width": round(page_w - 80.0, 1),
                                "height": round(size * 1.4, 1),
                                "fontSize": size,
                                "isBold": is_heading,
                            })
                            curr_y += size * 1.5 + 4.0
                    else:
                        words_sorted = sorted(words, key=lambda w: (round(w["top"] / 3.5) * 3.5, w["x0"]))
                        lines = []
                        curr_line = []
                        curr_top = None

                        for w in words_sorted:
                            if curr_top is None or abs(w["top"] - curr_top) < 3.5:
                                curr_line.append(w)
                                curr_top = w["top"] if curr_top is None else curr_top
                            else:
                                lines.append(curr_line)
                                curr_line = [w]
                                curr_top = w["top"]
                        if curr_line:
                            lines.append(curr_line)

                        for line_idx, line_words in enumerate(lines):
                            line_words = sorted(line_words, key=lambda w: w["x0"])
                            line_text = " ".join(w["text"] for w in line_words).strip()
                            if not line_text:
                                continue
                            
                            min_x = min(w["x0"] for w in line_words)
                            min_y = min(w["top"] for w in line_words)
                            max_x = max(w["x1"] for w in line_words)
                            max_y = max(w["bottom"] for w in line_words)
                            avg_size = sum(w.get("size", 10) for w in line_words) / len(line_words)
                            fontnames = "".join(str(w.get("fontname", "")) for w in line_words).lower()
                            is_bold = "bold" in fontnames or "black" in fontnames or "heavy" in fontnames or avg_size > 14
                            
                            extracted_elements.append({
                                "id": f"elem-{page_idx}-{line_idx}",
                                "text": line_text,
                                "x": round(min_x, 1),
                                "y": round(min_y, 1),
                                "width": round(max_x - min_x, 1),
                                "height": round(max_y - min_y, 1),
                                "fontSize": round(avg_size, 1),
                                "isBold": is_bold,
                            })

                    pages_data.append({
                        "pageNumber": page_idx + 1,
                        "width": page_w,
                        "height": page_h,
                        "elements": extracted_elements,
                    })
        except Exception as e:
            print("PDF Parse error:", e)
            raise HTTPException(status_code=400, detail=f"Could not parse PDF: {str(e)}")

    elif filename.endswith((".docx", ".doc")):
        try:
            doc = docx.Document(io.BytesIO(content))
            doc_elements = []
            curr_y = 40.0
            for p_idx, p in enumerate(doc.paragraphs):
                text = p.text.strip()
                if not text:
                    continue
                full_text += f"\n{text}"
                is_h1 = p.style.name.startswith("Heading 1")
                is_h2 = p.style.name.startswith("Heading 2")
                size = 18.0 if is_h1 else (14.0 if is_h2 else 10.5)
                is_bold = is_h1 or is_h2
                
                doc_elements.append({
                    "id": f"elem-docx-{p_idx}",
                    "text": text,
                    "x": 40.0,
                    "y": round(curr_y, 1),
                    "width": 515.0,
                    "height": size * 1.5,
                    "fontSize": size,
                    "isBold": is_bold,
                })
                curr_y += size * 1.8 + 6.0

            pages_data.append({
                "pageNumber": 1,
                "width": 595.0,
                "height": max(842.0, curr_y + 60.0),
                "elements": doc_elements,
            })
        except Exception as e:
            print("DOCX Parse error:", e)
            raise HTTPException(status_code=400, detail=f"Could not parse DOCX: {str(e)}")

    structured_data = build_structured_resume_data(full_text)

    return {
        "status": "success",
        "filename": file.filename,
        "resumeData": structured_data,
        "pages": pages_data,
        "pages_count": len(pages_data)
    }





