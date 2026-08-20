from typing import List, Optional
from pydantic import BaseModel, Field

class PersonalInfo(BaseModel):
    name: str = "Candidate"
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None

class Experience(BaseModel):
    role: str
    company: str
    duration: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)

class Education(BaseModel):
    degree: str
    institution: str
    year: Optional[str] = None
    grade: Optional[str] = None

class Project(BaseModel):
    title: str
    description: str
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None

class CandidateProfile(BaseModel):
    id: Optional[str] = None
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = ""
    skills: List[str] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = None
