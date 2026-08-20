import { useState } from 'react';
import { useResume } from '../context/ResumeContext';
import {
  User,
  Briefcase,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { BaseSectionItem } from '../types/resume';

export const FormPanel = () => {
  const {
    data,
    metadata,
    updateBasics,
    updateMetadata,
    updatePageSettings,
    addSectionItem,
    updateSectionItem,
    deleteSectionItem,
  } = useResume();

  const [activeTab, setActiveTab] = useState<'basics' | 'sections' | 'layout'>('basics');
  const [openSection, setOpenSection] = useState<string>('experience');

  // AI Generation States
  const [aiLoadingItem, setAiLoadingItem] = useState<string | null>(null);
  const [aiBulletSuggestions, setAiBulletSuggestions] = useState<Record<string, string[]>>({});
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummarySuggestions, setAiSummarySuggestions] = useState<string[]>([]);

  const handleFetchAiExperienceBullets = async (_secId: string, item: BaseSectionItem) => {
    setAiLoadingItem(item.id);
    try {
      const res = await fetch('http://localhost:8000/api/resumes/suggest/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: item.title || data.basics.headline || 'Software Engineer',
          company: item.subtitle || '',
          current_description: item.description || '',
          skills: item.tags || data.sections.skills?.items.flatMap((i) => i.tags || []) || [],
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.bullets) {
          setAiBulletSuggestions((prev) => ({
            ...prev,
            [item.id]: result.bullets,
          }));
        }
      }
    } catch (e) {
      console.warn('AI suggestions error', e);
    } finally {
      setAiLoadingItem(null);
    }
  };

  const handleApplyAiBullet = (secId: string, item: BaseSectionItem, bullet: string) => {
    const current = item.description || '';
    const updated = current ? `${current}\n• ${bullet}` : `• ${bullet}`;
    updateSectionItem(secId, item.id, { description: updated });
  };

  const handleFetchAiSummary = async (customHeadline?: string) => {
    setAiSummaryLoading(true);
    const targetTitle = customHeadline || data.basics.headline || 'Software Engineer';
    try {
      const res = await fetch('http://localhost:8000/api/resumes/suggest/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.basics.name,
          headline: targetTitle,
          job_title: targetTitle,
          experience_titles: data.sections.experience?.items.map((i) => i.title) || [],
          skills: data.sections.skills?.items.flatMap((i) => i.tags || []) || [],
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.summaries) {
          setAiSummarySuggestions(result.summaries);
        }
      }
    } catch (e) {
      console.warn('AI Summary error', e);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const { basics, sections } = data;

  return (
    <div className="no-print w-full lg:w-[520px] xl:w-[580px] shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-61px)] overflow-hidden shadow-2xl">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-2.5 gap-2">
        <button
          onClick={() => setActiveTab('basics')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'basics'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User size={15} /> Profile & Contact
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'sections'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Briefcase size={15} /> Experience & Content
        </button>
        <button
          onClick={() => setActiveTab('layout')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'layout'
              ? 'bg-sky-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings size={15} /> Styling & Layout
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* BASICS TAB */}
        {activeTab === 'basics' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">
              Personal Information
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                value={basics.name}
                onChange={(e) => updateBasics({ name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400 block">Professional Headline / Job Title</label>
                {basics.headline && (
                  <button
                    type="button"
                    disabled={aiSummaryLoading}
                    onClick={() => handleFetchAiSummary(basics.headline)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={11} className="text-amber-400" /> Suggest Summary for this role
                  </button>
                )}
              </div>
              <input
                type="text"
                value={basics.headline}
                onChange={(e) => updateBasics({ headline: e.target.value })}
                placeholder="e.g. Senior Full Stack Engineer, DevOps Engineer"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={basics.email}
                  onChange={(e) => updateBasics({ email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={basics.phone}
                  onChange={(e) => updateBasics({ phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Location</label>
                <input
                  type="text"
                  value={basics.location}
                  onChange={(e) => updateBasics({ location: e.target.value })}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Website URL</label>
                <input
                  type="text"
                  value={basics.website}
                  onChange={(e) => updateBasics({ website: e.target.value })}
                  placeholder="https://yoursite.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Portfolio Link</label>
                <input
                  type="text"
                  value={basics.portfolioUrl || ''}
                  onChange={(e) => updateBasics({ portfolioUrl: e.target.value })}
                  placeholder="https://portfolio.dev"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={basics.linkedin}
                  onChange={(e) => updateBasics({ linkedin: e.target.value })}
                  placeholder="linkedin.com/in/username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">GitHub Profile</label>
                <input
                  type="text"
                  value={basics.github}
                  onChange={(e) => updateBasics({ github: e.target.value })}
                  placeholder="github.com/username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            {/* Summary / About Me with AI Generator */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block">About Me / Professional Summary</label>
                  <span className="text-[10px] text-slate-400">
                    Role: <span className="text-sky-400 font-medium">{basics.headline || 'Software Engineer'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={aiSummaryLoading}
                  onClick={() => handleFetchAiSummary()}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-indigo-500/20 to-sky-500/20 hover:from-indigo-500/30 hover:to-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {aiSummaryLoading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} className="text-amber-400" /> AI Suggestions
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={4}
                value={basics.summary}
                onChange={(e) => updateBasics({ summary: e.target.value })}
                placeholder="High-impact professional with expertise in scalable systems..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500 leading-relaxed resize-y"
              />

              {/* AI Generated Summary Suggestions Dropdown Cards */}
              {aiSummarySuggestions.length > 0 && (
                <div className="bg-slate-850 border border-sky-500/30 rounded-xl p-3.5 space-y-2.5 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-400" /> AI Suggestions for "{basics.headline || 'Role'}":
                    </span>
                    <button
                      type="button"
                      onClick={() => setAiSummarySuggestions([])}
                      className="text-[10px] text-slate-400 hover:text-slate-200"
                    >
                      Dismiss
                    </button>
                  </div>
                  {aiSummarySuggestions.map((sug, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        updateBasics({ summary: sug });
                        setAiSummarySuggestions([]);
                      }}
                      className="p-2.5 bg-slate-800/80 hover:bg-sky-500/10 border border-slate-750 hover:border-sky-500/40 rounded-lg text-xs text-slate-200 hover:text-white cursor-pointer transition-all leading-relaxed"
                    >
                      <span className="text-[10px] font-semibold text-sky-400 block mb-1 uppercase tracking-wider">
                        {i === 0 ? 'Option 1 · Results-Driven' : i === 1 ? 'Option 2 · Technical Depth' : 'Option 3 · Leadership & Delivery'}
                      </span>
                      "{sug}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTIONS CONTENT TAB */}
        {activeTab === 'sections' && (
          <div className="space-y-4">
            {Object.keys(sections).map((secId) => {
              const sec = sections[secId];
              const isOpen = openSection === secId;

              return (
                <div key={secId} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-850">
                  <button
                    onClick={() => setOpenSection(isOpen ? '' : secId)}
                    className="w-full p-3.5 bg-slate-800/80 flex items-center justify-between hover:bg-slate-800 transition-all text-left cursor-pointer"
                  >
                    <span className="font-semibold text-sm text-slate-200">{sec.title}</span>
                    <span className="text-slate-400">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="p-4 space-y-4 bg-slate-900/60 border-t border-slate-800">
                      {sec.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-slate-800/50 border border-slate-750 rounded-lg space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-sky-400">
                              Item #{idx + 1}
                            </span>
                            <button
                              onClick={() => deleteSectionItem(secId, item.id)}
                              className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] text-slate-400 block">Job Title / Role</label>
                                {item.title && (
                                  <button
                                    type="button"
                                    disabled={aiLoadingItem === item.id}
                                    onClick={() => handleFetchAiExperienceBullets(secId, item)}
                                    className="text-[10px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
                                  >
                                    <Sparkles size={10} className="text-amber-400" /> Suggest Bullets
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={item.title}
                                placeholder="e.g. Senior Software Engineer"
                                onChange={(e) =>
                                  updateSectionItem(secId, item.id, { title: e.target.value })
                                }
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">
                                Subtitle / Organization
                              </label>
                              <input
                                type="text"
                                value={item.subtitle || ''}
                                onChange={(e) =>
                                  updateSectionItem(secId, item.id, { subtitle: e.target.value })
                                }
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">
                                Date / Period (Month & Year)
                              </label>
                              <input
                                type="text"
                                value={item.date || ''}
                                onChange={(e) =>
                                  updateSectionItem(secId, item.id, { date: e.target.value })
                                }
                                placeholder="e.g. Jan 2022 - Present"
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 block mb-1">Location</label>
                              <input
                                type="text"
                                value={item.location || ''}
                                onChange={(e) =>
                                  updateSectionItem(secId, item.id, { location: e.target.value })
                                }
                                placeholder="Remote / City"
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          </div>

                          {sec.type !== 'skills' && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-slate-300">
                                  Bullet Points & Responsibilities
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={aiLoadingItem === item.id}
                                    onClick={() => handleFetchAiExperienceBullets(secId, item)}
                                    className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 font-bold px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded cursor-pointer disabled:opacity-50 transition-all"
                                  >
                                    {aiLoadingItem === item.id ? (
                                      <>
                                        <Loader2 size={11} className="animate-spin text-amber-400" /> Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={11} className="text-amber-400" /> AI Suggestions
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = item.description || '';
                                      const next = current ? `${current}\n• ` : '• ';
                                      updateSectionItem(secId, item.id, { description: next });
                                    }}
                                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded cursor-pointer"
                                  >
                                    + Add Bullet (•)
                                  </button>
                                </div>
                              </div>

                              <textarea
                                rows={5}
                                value={item.description || ''}
                                onChange={(e) =>
                                  updateSectionItem(secId, item.id, { description: e.target.value })
                                }
                                placeholder="• Spearheaded microservice architecture redesign...&#10;• Reduced latency by 35% across all core endpoints..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500 leading-relaxed resize-y font-sans min-h-[110px]"
                              />

                              {/* AI Generated Bullet Suggestions (Click to Add) */}
                              {aiBulletSuggestions[item.id] && aiBulletSuggestions[item.id].length > 0 && (
                                <div className="mt-2.5 p-3 bg-slate-850 border border-amber-500/30 rounded-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                      <Sparkles size={12} /> Click any AI bullet below to add to your CV:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAiBulletSuggestions((prev) => {
                                          const copy = { ...prev };
                                          delete copy[item.id];
                                          return copy;
                                        });
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-white"
                                    >
                                      Dismiss
                                    </button>
                                  </div>

                                  <div className="space-y-1.5">
                                    {aiBulletSuggestions[item.id].map((bullet, bIdx) => (
                                      <div
                                        key={bIdx}
                                        onClick={() => handleApplyAiBullet(secId, item, bullet)}
                                        className="p-2 bg-slate-800 hover:bg-amber-500/10 border border-slate-750 hover:border-amber-500/40 rounded-lg text-xs text-slate-200 hover:text-white cursor-pointer transition-all flex items-start gap-2 group"
                                      >
                                        <Plus size={13} className="text-amber-400 shrink-0 mt-0.5 group-hover:scale-125 transition-transform" />
                                        <span className="leading-relaxed flex-1">{bullet}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">
                              Tags / Skills (comma separated)
                            </label>
                            <input
                              type="text"
                              value={(item.tags || []).join(', ')}
                              onChange={(e) =>
                                updateSectionItem(secId, item.id, {
                                  tags: e.target.value
                                    .split(',')
                                    .map((t) => t.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="React, TypeScript, GraphQL"
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() =>
                          addSectionItem(secId, {
                            title: `New ${sec.title.replace(/s$/, '')}`,
                            subtitle: '',
                            date: '2024',
                            description: '',
                            tags: [],
                          })
                        }
                        className="w-full py-2 border border-dashed border-slate-700 hover:border-sky-500 text-slate-300 hover:text-sky-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus size={14} /> Add Item to {sec.title}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* LAYOUT & SETTINGS TAB */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 mb-3">
                Page & Layout Customization
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Sidebar Width</span>
                    <span className="font-semibold text-sky-400">
                      {metadata.page.sidebarWidth}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={45}
                    value={metadata.page.sidebarWidth}
                    onChange={(e) => updatePageSettings({ sidebarWidth: Number(e.target.value) })}
                    className="w-full accent-sky-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Heading Font Size</span>
                    <span className="font-semibold text-sky-400">
                      {metadata.typography.headingSize}pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min={11}
                    max={18}
                    value={metadata.typography.headingSize}
                    onChange={(e) =>
                      updateMetadata({
                        typography: {
                          ...metadata.typography,
                          headingSize: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-sky-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Body Font Size</span>
                    <span className="font-semibold text-sky-400">
                      {metadata.typography.bodySize}pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={13}
                    value={metadata.typography.bodySize}
                    onChange={(e) =>
                      updateMetadata({
                        typography: {
                          ...metadata.typography,
                          bodySize: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
