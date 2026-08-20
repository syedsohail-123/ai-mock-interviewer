import { useState, useEffect } from 'react';
import { useResume } from '../context/ResumeContext';
import { getTemplate } from '../templates';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export const PreviewPanel = ({ selectedTemplate }: { selectedTemplate: string }) => {
  const { data, metadata } = useResume();
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 0.45;
      if (window.innerWidth < 1024) return 0.65;
    }
    return 0.85;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setScale((prev) => (prev > 0.6 ? 0.45 : prev));
      } else if (window.innerWidth < 1024) {
        setScale((prev) => (prev > 0.8 ? 0.65 : prev));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const TemplateComponent = getTemplate(selectedTemplate);

  return (
    <div className="flex-1 bg-slate-950/80 flex flex-col h-[calc(100vh-61px)] overflow-hidden relative print:!h-auto print:!overflow-visible print:!bg-white print:!block print:!p-0 print:!m-0">
      {/* Zoom / Scale Toolbar */}
      <div className="no-print absolute bottom-6 right-6 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-xl">
        <button
          onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-mono text-slate-300 px-2 select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(1.4, Number((s + 0.1).toFixed(1))))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <div className="h-4 w-px bg-slate-800 mx-0.5" />
        <button
          onClick={() => setScale(0.85)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Reset Zoom"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Preview Container Canvas */}
      <div className="flex-1 overflow-auto p-6 md:p-12 flex justify-center items-start print:!p-0 print:!m-0 print:!overflow-visible print:!bg-white print:!block">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
          className="transition-transform duration-100 ease-out print:!transform-none print:!m-0 print:!p-0 print:!block"
        >
          <TemplateComponent data={data} metadata={metadata} />
        </div>
      </div>
    </div>
  );
};
