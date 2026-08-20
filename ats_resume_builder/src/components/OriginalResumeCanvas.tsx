import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  Eye,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { ResumeData } from '../types/resume';

export interface ResumeElement {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
}

export interface ResumePage {
  pageNumber: number;
  width: number;
  height: number;
  elements: ResumeElement[];
}

interface OriginalResumeCanvasProps {
  initialPages?: ResumePage[];
  fileName?: string;
  onUpdatePages?: (pages: ResumePage[]) => void;
  onUploadSuccess?: (pages: ResumePage[], resumeData?: ResumeData) => void;
  onSwitchToTemplates?: () => void;
}

export const OriginalResumeCanvas: React.FC<OriginalResumeCanvasProps> = ({
  initialPages = [],
  fileName = 'My Original Resume',
  onUpdatePages,
  onUploadSuccess,
  onSwitchToTemplates,
}) => {
  const [pages, setPages] = useState<ResumePage[]>(initialPages);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(fileName);
  const [selectedElemId, setSelectedElemId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'visual' | 'flow'>('visual');

  useEffect(() => {
    if (initialPages && initialPages.length > 0 && pages.length === 0) {
      setPages(initialPages);
    }
  }, [initialPages]);

  const handleUpdateElementText = (pageIdx: number, elemId: string, newText: string) => {
    setPages((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx !== pageIdx) return p;
        return {
          ...p,
          elements: p.elements.map((el) => (el.id === elemId ? { ...el, text: newText } : el)),
        };
      });
      if (onUpdatePages) onUpdatePages(updated);
      return updated;
    });
  };

  const handleDeleteElement = (pageIdx: number, elemId: string) => {
    setPages((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx !== pageIdx) return p;
        return {
          ...p,
          elements: p.elements.filter((el) => el.id !== elemId),
        };
      });
      if (onUpdatePages) onUpdatePages(updated);
      return updated;
    });
    setSelectedElemId(null);
  };

  const handleAddTextBox = (pageIdx: number) => {
    const newElem: ResumeElement = {
      id: `new-elem-${Date.now()}`,
      text: 'New Text / Bullet Point',
      x: 50,
      y: 100,
      width: 250,
      height: 20,
      fontSize: 11,
      isBold: false,
    };

    setPages((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx !== pageIdx) return p;
        return {
          ...p,
          elements: [...p.elements, newElem],
        };
      });
      if (onUpdatePages) onUpdatePages(updated);
      return updated;
    });
    setSelectedElemId(newElem.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCurrentFileName(file.name);

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
          if (result.pages && result.pages.length > 0) {
            setPages(result.pages);
            if (onUpdatePages) onUpdatePages(result.pages);
            if (onUploadSuccess) onUploadSuccess(result.pages, result.resumeData);
            success = true;
            break;
          }
        }
      } catch {
        // Try next endpoint
      }
    }

    if (!success) {
      alert('Unable to reach the backend at http://127.0.0.1:8000 / localhost:8000. Make sure the backend server is running (python main.py).');
    }

    e.target.value = '';
    setIsUploading(false);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col min-h-screen">
      {/* Top Action Toolbar */}
      <div className="no-print bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left: Document Info & Upload */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <FileText size={15} className="text-sky-400" />
            <span className="text-xs font-semibold text-white max-w-[180px] truncate">
              {currentFileName}
            </span>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer">
            <Upload size={14} />
            <span>{isUploading ? 'Parsing Resume...' : 'Upload Original PDF'}</span>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Center: Controls & Zoom */}
        {pages.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === 'visual' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={13} /> Visual PDF
              </button>
              <button
                onClick={() => setViewMode('flow')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === 'flow' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type size={13} /> Clean Text
              </button>
            </div>

            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 gap-1 text-xs text-slate-300">
              <button
                onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-1 text-[11px] font-mono">{Math.round(zoomScale * 100)}%</span>
              <button
                onClick={() => setZoomScale((z) => Math.min(1.5, z + 0.1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <button
              onClick={() => handleAddTextBox(0)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              <Plus size={14} className="text-emerald-400" />
              <span>Add Text</span>
            </button>
          </div>
        )}

        {/* Right: Switcher */}
        <div className="flex items-center gap-2">
          {onSwitchToTemplates && (
            <button
              onClick={onSwitchToTemplates}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              Use Template Engine
            </button>
          )}
        </div>
      </div>

      {/* Editor Main Canvas Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-start bg-slate-950">
        {pages.length === 0 ? (
          <div className="no-print flex flex-col items-center justify-center h-[180mm] w-full max-w-[210mm] text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/40 mt-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/10">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Upload Your Original Resume
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Upload your original PDF resume. It will render with your exact columns, sidebars, headers, and typography—allowing you to click and edit any text in-place without template restrictions.
            </p>
            <label className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xl shadow-sky-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95">
              <Upload size={16} />
              <span>{isUploading ? 'Parsing Resume...' : 'Select PDF Resume'}</span>
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        ) : (
          <div
            className="flex flex-col gap-8 items-center transition-transform origin-top"
            style={{ transform: `scale(${zoomScale})` }}
          >
            {pages.map((page, pageIdx) => {
              const baseWidth = page.width || 595.28;
              const baseHeight = page.height || 841.89;

              if (viewMode === 'flow') {
                // Clean Flow Mode
                return (
                  <div
                    key={page.pageNumber}
                    className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm p-[18mm] font-sans selection:bg-sky-200"
                  >
                    <div className="flex justify-between items-center border-b pb-2 mb-4 text-xs text-slate-400">
                      <span>Page {page.pageNumber}</span>
                      <span>Flow Layout Mode</span>
                    </div>
                    {page.elements.map((el) => (
                      <div
                        key={el.id}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleUpdateElementText(pageIdx, el.id, e.currentTarget.innerText)}
                        style={{
                          fontSize: `${Math.max(10, el.fontSize)}px`,
                          fontWeight: el.isBold ? 700 : 400,
                          marginBottom: '6px',
                        }}
                        className="outline-none hover:bg-sky-50 focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded px-1"
                      >
                        {el.text}
                      </div>
                    ))}
                  </div>
                );
              }

              // Exact Visual PDF Canvas Mode
              return (
                <div
                  key={page.pageNumber}
                  style={{
                    width: `${baseWidth}px`,
                    height: `${baseHeight}px`,
                    position: 'relative',
                  }}
                  className="bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-700 selection:bg-sky-200 print:shadow-none print:border-none print:m-0 print:p-0"
                >
                  {/* Interactive Pure Vector Text Elements (100% Crisp, No Blur) */}
                  {page.elements.map((el) => {
                    const isSelected = selectedElemId === el.id;

                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElemId(el.id)}
                        style={{
                          position: 'absolute',
                          left: `${el.x}px`,
                          top: `${el.y}px`,
                          minWidth: `${Math.max(el.width, 20)}px`,
                          fontSize: `${el.fontSize}px`,
                          fontWeight: el.isBold ? 700 : 400,
                          lineHeight: 1.2,
                        }}
                        className={`group cursor-text transition-all rounded-xs text-slate-900 ${
                          isSelected
                            ? 'ring-2 ring-sky-500 bg-sky-50/80 z-20 shadow-xs'
                            : 'hover:bg-sky-50/60 hover:ring-1 hover:ring-sky-300 z-10'
                        }`}
                      >
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) =>
                            handleUpdateElementText(pageIdx, el.id, e.currentTarget.innerText)
                          }
                          className="outline-none px-0.5 whitespace-pre-wrap select-text text-slate-900 font-sans"
                        >
                          {el.text}
                        </div>

                        {isSelected && (
                          <div className="no-print absolute -top-7 right-0 flex items-center gap-1 bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-lg text-[10px] z-30">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteElement(pageIdx, el.id);
                              }}
                              className="text-rose-400 hover:text-rose-300 p-0.5"
                              title="Delete text"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
