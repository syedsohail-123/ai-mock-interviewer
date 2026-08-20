import { useState, useEffect, MouseEvent } from 'react';
import { useResume } from '../context/ResumeContext';
import { templates } from '../templates';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Clock,
  Sparkles,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  LayoutGrid,
  Smartphone,
  Upload,
} from 'lucide-react';
import { ResumeData } from '../types/resume';
import { ResumePage } from './OriginalResumeCanvas';

interface SavedResumeCard {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
  data: ResumeData;
  score: number;
}

const DASHBOARD_STORAGE_KEY = 'ats_saved_resumes_v3';

export const sampleAlexResumeData: ResumeData = {
  id: 'resume-alex-sample',
  title: 'Alex Morgan - DevOps Engineer (Sample)',
  basics: {
    name: 'Alex Morgan',
    headline: 'Senior Software & Cloud DevOps Engineer',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    website: 'https://alexmorgan.dev',
    portfolioUrl: 'https://alexmorgan.dev',
    linkedin: 'https://linkedin.com/in/alexmorgan',
    github: 'https://github.com/alexmorgan',
    photoUrl: '',
    summary: 'Results-driven Senior Software & Cloud Engineer with 6+ years of experience designing scalable microservices, automating multi-region cloud infrastructure, and establishing high-velocity CI/CD pipelines. Proven track record in boosting system throughput, reducing cloud operational expenditure by 28%, and maintaining 99.99% production uptime.',
  },
  sections: {
    summary: {
      id: 'summary',
      title: 'Professional Summary',
      type: 'custom',
      visible: true,
      items: [],
    },
    experience: {
      id: 'experience',
      title: 'Work Experience',
      type: 'experience',
      visible: true,
      items: [
        {
          id: 'exp-1',
          title: 'Senior DevOps & Platform Engineer',
          subtitle: 'Apex Cloud Technologies',
          date: 'Jan 2022 - Present',
          location: 'San Francisco, CA (Hybrid)',
          description: `• Spearheaded migration from legacy monolith to Kubernetes microservices on AWS (EKS), reducing infrastructure costs by 28% and doubling request throughput.
• Architected automated multi-region GitOps CI/CD deployment pipelines with ArgoCD and GitHub Actions, cutting release cycles from 4 hours to 12 minutes.
• Engineered real-time observability telemetry using Prometheus and Grafana dashboards, increasing service reliability to 99.99% uptime.
• Mentored 6 software engineers and led cross-functional architecture reviews across distributed teams.`,
        },
        {
          id: 'exp-2',
          title: 'Full Stack Software Engineer',
          subtitle: 'Quantum Enterprise Systems',
          date: 'Mar 2019 - Dec 2021',
          location: 'Remote',
          description: `• Designed and deployed high-performance REST and GraphQL APIs handling over 25M daily transactions with sub-80ms p99 latency.
• Built reusable modular frontend components in React and TypeScript, improving Core Web Vitals score from 68 to 94.
• Optimized PostgreSQL query indexes and Redis caching layers, eliminating database bottlenecks during high-traffic flash sales.`,
        },
      ],
    },
    skills: {
      id: 'skills',
      title: 'Technical Skills',
      type: 'skills',
      visible: true,
      items: [
        {
          id: 'sk-1',
          title: 'Cloud & Infrastructure',
          tags: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Helm', 'Linux'],
        },
        {
          id: 'sk-2',
          title: 'Languages & Frameworks',
          tags: ['Python', 'Go', 'TypeScript', 'React', 'Node.js', 'Next.js'],
        },
        {
          id: 'sk-3',
          title: 'Databases & Observability',
          tags: ['PostgreSQL', 'Redis', 'MongoDB', 'Prometheus', 'Grafana', 'Datadog'],
        },
      ],
    },
    projects: {
      id: 'projects',
      title: 'Key Projects',
      type: 'projects',
      visible: true,
      items: [
        {
          id: 'proj-1',
          title: 'Automated Cloud Infrastructure Orchestrator',
          subtitle: 'Open Source Infrastructure as Code Service',
          date: 'Aug 2023 - Present',
          url: 'https://github.com/alexmorgan/cloud-orchestrator',
          tags: ['Kubernetes', 'Terraform', 'Go', 'AWS'],
          description: '• Built a lightweight distributed cluster provisioning engine enabling 1-click ephemeral development environments, saving 15+ engineering hours per week.',
        },
      ],
    },
    education: {
      id: 'education',
      title: 'Education',
      type: 'education',
      visible: true,
      items: [
        {
          id: 'edu-1',
          title: 'Bachelor of Science in Computer Science',
          subtitle: 'University of California, Berkeley',
          date: 'Aug 2015 - May 2019',
          location: 'Berkeley, CA',
        },
      ],
    },
    certifications: {
      id: 'certifications',
      title: 'Certifications',
      type: 'certifications',
      visible: true,
      items: [
        {
          id: 'cert-1',
          title: 'AWS Certified Solutions Architect – Professional',
          date: 'Verified',
        },
        {
          id: 'cert-2',
          title: 'Certified Kubernetes Administrator (CKA)',
          date: 'Verified',
        },
      ],
    },
  },
  metadata: {
    colors: {
      primary: '#0ea5e9',
      background: '#ffffff',
      text: '#1e293b',
      sidebar: '#f8fafc',
      sidebarText: '#0f172a',
    },
    typography: {
      headingSize: 14,
      bodySize: 10,
      fontFamily: 'Inter, sans-serif',
      lineHeight: 1.5,
    },
    page: {
      size: 'A4',
      sidebarWidth: 32,
      hideIcons: false,
      hideLinkUnderline: true,
    },
    layout: {
      sidebar: ['skills', 'education', 'certifications'],
      main: ['summary', 'experience', 'projects'],
    },
  },
};

export const DashboardView = ({
  onSelectResume,
  onCreateNew,
  onOpenInterviewKey,
  onUploadOriginal,
}: {
  onSelectResume: (resume: ResumeData, templateName: string) => void;
  onCreateNew: () => void;
  onOpenInterviewKey?: (resumeData?: ResumeData) => void;
  onUploadOriginal?: (pages: ResumePage[], filename: string, resumeData?: ResumeData) => void;
}) => {
  const { data: currentData, setResumeData, resetToDefault } = useResume();
  const [isParsingUpload, setIsParsingUpload] = useState(false);

  const [resumes, setResumes] = useState<SavedResumeCard[]>(() => {
    const saved = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to load saved resumes', e);
      }
    }
    if (currentData.basics.name) {
      return [
        {
          id: 'res-current',
          title: `${currentData.basics.name}'s Resume`,
          template: 'devops',
          updatedAt: 'Just now',
          data: currentData,
          score: 85,
        },
      ];
    }
    return [];
  });

  useEffect(() => {
    if (!currentData.basics.name) return;
    setResumes((prev) => {
      const activeId = currentData.id || 'res-current';
      const exists = prev.some((c) => c.id === activeId || c.data.id === activeId);

      if (!exists) {
        return [
          {
            id: activeId,
            title: `${currentData.basics.name}'s Resume`,
            template: 'original',
            updatedAt: 'Just now',
            data: currentData,
            score: 85,
          },
          ...prev,
        ];
      }

      return prev.map((card) => {
        if (card.id === activeId || card.data.id === activeId) {
          return {
            ...card,
            title: `${currentData.basics.name}'s Resume`,
            data: currentData,
            updatedAt: 'Just now',
          };
        }
        return card;
      });
    });
  }, [currentData]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(resumes));
  }, [resumes]);

  const handleDelete = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setResumes((prev) => prev.filter((r) => r.id !== id && r.data?.id !== id));
    if (currentData.id === id) {
      resetToDefault();
    }
  };

  const handleLoadSampleAlex = () => {
    setResumeData(sampleAlexResumeData);
    onSelectResume(sampleAlexResumeData, 'devops');
  };

  const handleDuplicate = (card: SavedResumeCard, e: MouseEvent) => {
    e.stopPropagation();
    const duplicated: SavedResumeCard = {
      ...card,
      id: `res-${Date.now()}`,
      title: `${card.title} (Copy)`,
      updatedAt: 'Just now',
    };
    setResumes((prev) => [duplicated, ...prev]);
  };

  const handleCreateNew = () => {
    resetToDefault();
    onCreateNew();
  };

  const handleUploadOriginalPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingUpload(true);
    const formData = new FormData();
    formData.append('file', file);

    const endpoints = [
      'http://127.0.0.1:8000/api/resumes/parse-original',
      'http://localhost:8000/api/resumes/parse-original',
    ];

    let success = false;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (onUploadOriginal) {
            onUploadOriginal(result.pages || [], file.name, result.resumeData);
            success = true;
            break;
          }
        }
      } catch {
        // Try next endpoint
      }
    }

    if (!success) {
      alert('Unable to reach the backend server at http://127.0.0.1:8000 / localhost:8000. Please ensure the backend is running (python main.py).');
    }

    e.target.value = '';
    setIsParsingUpload(false);
  };

  // Quick ATS score calculation breakdown
  const calculateMetrics = () => {
    const hasSummary = Boolean(currentData.basics.summary);
    const hasPhoto = Boolean(currentData.basics.photoUrl);
    const expCount = currentData.sections.experience?.items.length || 0;
    const skillCount = currentData.sections.skills?.items.reduce((acc, i) => acc + (i.tags?.length || 0), 0) || 0;
    const hasPortfolio = Boolean(currentData.basics.portfolioUrl);

    return {
      score: Math.min(100, (hasSummary ? 20 : 0) + (expCount >= 2 ? 30 : 15) + (skillCount >= 6 ? 25 : 10) + (hasPortfolio ? 15 : 0) + 10),
      hasSummary,
      hasPhoto,
      expCount,
      skillCount,
      hasPortfolio,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 overflow-y-auto p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">
                Overview & Manager
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Candidate Resume Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your tailored CV versions, track ATS optimization scores, or upload your original resume to edit without templates.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-sm">
              <Upload size={15} />
              <span>{isParsingUpload ? 'Uploading...' : 'Upload Original PDF'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={handleUploadOriginalPdf}
                disabled={isParsingUpload}
              />
            </label>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} /> Create New Resume
            </button>
          </div>
        </div>

        {/* Analytics & ATS Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Overall ATS Readiness
              </span>
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <BarChart3 size={18} />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{metrics.score}%</span>
              <span className="text-xs text-emerald-400 font-semibold">High Match</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                style={{ width: `${metrics.score}%` }}
                className="bg-gradient-to-r from-emerald-500 to-sky-500 h-full rounded-full transition-all"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saved CV Profiles
              </span>
              <span className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <FileText size={18} />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{resumes.length}</span>
              <span className="text-xs text-slate-400">Tailored Versions</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Ready for quick customization & export</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Available Templates
              </span>
              <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <LayoutGrid size={18} />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{Object.keys(templates).length}</span>
              <span className="text-xs text-indigo-400 font-semibold">Distinct Layouts</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">DevOps, Onyx, Minimalist, Pikachu & more</p>
          </div>
        </div>

        {/* Resume Versions Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-sky-400" /> Your Resume Documents
            </h2>
            <span className="text-xs text-slate-400">{resumes.length} active documents</span>
          </div>

          {resumes.length === 0 ? (
            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center bg-slate-900/30">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mb-4">
                <FileText size={28} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Active Resumes Stored</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-5">
                Upload your PDF resume or start with a clean blank canvas. You can also explore the sample template below.
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer">
                  <Upload size={15} />
                  <span>Upload PDF Resume</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={handleUploadOriginalPdf}
                  />
                </label>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                >
                  <Plus size={15} /> Create Blank Resume
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resumes.map((card) => {
                const tmpl = templates[card.template];

                return (
                  <div
                    key={card.id}
                    onClick={() => onSelectResume(card.data, card.template)}
                    className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer group relative"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700">
                          {tmpl?.name || card.template}
                        </span>
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Sparkles size={12} /> {card.score}% ATS
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-1">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock size={12} /> Last edited {card.updatedAt}
                      </p>
                    </div>

                    {/* Actions footer */}
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3.5 mt-2">
                      <div className="flex items-center gap-2">
                        {onOpenInterviewKey && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenInterviewKey(card.data);
                            }}
                            title="Generate Mobile Interview Key for this Resume"
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-md transition-colors cursor-pointer"
                          >
                            <Smartphone size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDuplicate(card, e)}
                          title="Duplicate CV"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(card.id, e)}
                          title="Delete / Remove this CV"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <span className="text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Open Editor <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sample Templates & Presets (Alex Morgan Sample) */}
        <div className="space-y-4 border-t border-slate-850 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" /> Sample Candidate Templates
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Explore pre-filled production examples to test templates and AI tools.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div
              onClick={handleLoadSampleAlex}
              className="bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                    Sample Preset
                  </span>
                  <span className="text-xs text-slate-400 font-medium">DevOps Classic</span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                  Alex Morgan - Senior DevOps Engineer
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Pre-configured sample with Kubernetes, AWS, microservices experience bullets, and technical skills breakdown.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-1">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Load Alex's Sample Template <ArrowRight size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ATS Checklist Recommendations */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" /> ATS Optimization Checklist
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Professional Summary</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Action-Oriented Bullets</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Technical Skills Categorized</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Standard A4 Print Layout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
