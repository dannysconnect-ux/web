import React, { useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  Layers,
  ShieldCheck,
  Calendar,
  CheckCircle2
} from 'lucide-react';

/* ============================================================
   1. MAIN CONTROLLER — DECIDES WHICH RENDERER TO USE
   ============================================================ */
export default function SmartDocumentView() {
  const location = useLocation();
  const navigate = useNavigate();

  const { data, meta } = location.state || {};

  // Block direct access without data
  useEffect(() => {
    if (!data) navigate('/dashboard');
  }, [data, navigate]);

  if (!data) return null;

  // CASE A — School Custom HTML Template
  if (data.type === 'custom_html' || data.html) {
    return (
      <SchoolTemplateRenderer
        html={data.html || data.custom_html}
        schoolName={data.school_name || meta?.school || 'School Document'}
        meta={meta}
      />
    );
  }

  // CASE B — Standard Structured JSON
  return <StandardJsonRenderer data={data} meta={meta} />;
}

/* ============================================================
   2. SCHOOL TEMPLATE RENDERER — IFRAME (A4 NATIVE PRINTABLE)
   ============================================================ */
function SchoolTemplateRenderer({ html, schoolName }: { html: string; schoolName: string; meta: any }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleDownloadPdf = () => {
    if (!iframeRef.current?.contentWindow) return;
    const frame = iframeRef.current.contentWindow;
    frame.focus();
    frame.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col h-screen">
      <Toolbar
        title={schoolName}
        subtitle="Official School Format"
        onDownload={handleDownloadPdf}
      />

      <div className="flex-1 bg-slate-800/50 p-8 overflow-y-auto flex justify-center items-start">
        <div className="relative animate-in fade-in zoom-in duration-300">

          {/* Floating Label */}
          <div className="absolute -top-6 left-0 text-xs text-slate-500 font-mono flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live A4 Preview
          </div>

          {/* A4 CANVAS */}
          <div className="bg-white shadow-2xl w-[210mm] h-[297mm] mx-auto overflow-hidden rounded-sm ring-1 ring-white/10">
            <iframe
              ref={iframeRef}
              srcDoc={html}
              className="w-full h-full border-none"
              title="Document Preview"
              sandbox="allow-same-origin allow-scripts allow-popups allow-modals"
            />
          </div>

        </div>
      </div>
    </div>
  );
}

/* ============================================================
   3. STANDARD REACT DOCUMENT RENDERER
   ============================================================ */
// ==========================================
// 3. STANDARD JSON RENDERER (SMART ORIENTATION)
// ==========================================
function StandardJsonRenderer({ data, meta }: { data: any; meta: any }) {
  const content = data.data || data; 
  const docType = meta?.docType || 'lesson';

  // 1. Determine Orientation based on Doc Type
  const isLandscape = docType === 'scheme' || docType === 'weekly';

  const handleDownloadPdf = () => {
    window.print(); 
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans print:bg-white print:min-h-0">
      
      {/* 2. INJECT CSS FOR PRINT ORIENTATION */}
      <style>{`
        @media print {
          @page {
            size: ${isLandscape ? 'landscape' : 'portrait'};
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Toolbar (Hidden when printing) */}
      <div className="print:hidden">
        <Toolbar 
          title={isLandscape ? "Wide Format Document" : "Standard Document"} 
          subtitle={isLandscape ? "Landscape View" : "Portrait View"}
          onDownload={handleDownloadPdf} 
        />
      </div>

      {/* --- PREVIEW AREA --- */}
      <div className="flex justify-center p-8 print:p-0 print:block overflow-x-auto">
        
        {/* 3. DYNAMIC CONTAINER SIZE (Screen Preview) */}
        <div 
          id="printable-content"
          className={`
            bg-white shadow-xl mx-auto text-slate-900 
            print:shadow-none print:w-full print:mx-0 print:p-0
            ${isLandscape 
               ? 'w-[297mm] min-h-[210mm] p-[15mm]' // Landscape Dimensions
               : 'w-[210mm] min-h-[297mm] p-[20mm]' // Portrait Dimensions
            }
          `}
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                {docType === 'scheme' ? 'Scheme of Work' : docType === 'weekly' ? 'Weekly Forecast' : 'Lesson Plan'}
              </h1>
              <p className="text-slate-500 font-bold text-sm mt-1">{meta?.school || 'BooxClash Education'}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated On</div>
              <div className="font-mono text-sm font-bold">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Meta Data Grid */}
          <div className="grid grid-cols-3 gap-6 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100 print:bg-transparent print:border-slate-300 print:p-0">
             <MetaItem label="Subject" value={meta?.subject || content.subject} />
             <MetaItem label="Grade / Class" value={meta?.grade || content.grade} />
             <MetaItem label="Topic" value={meta?.topic || content.topic} />
          </div>

          {/* Content */}
          <div className="space-y-8">
            {docType === 'lesson' && <LessonPlanContent content={content} />}
            {docType === 'scheme' && <SchemeContent content={content} />}
            {docType === 'weekly' && <WeeklyContent content={content} />}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 hidden print:block">
            Powered by BooxClash AI • Page 1 of 1
          </div>
        </div>

      </div>
    </div>
  );
}

/* ============================================================
   4. REUSABLE COMPONENTS
   ============================================================ */
function Toolbar({ title, subtitle, onDownload }: { title: string; subtitle: string; onDownload: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <FileText size={18} className="text-emerald-400" />
            {title}
          </h1>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <button
        onClick={onDownload}
        className="
          flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500
          text-white px-5 py-2.5 rounded-lg font-bold shadow-lg
          shadow-emerald-900/20 transition-all active:scale-95 group
        "
      >
        <Download size={18} className="group-hover:animate-bounce" />
        <span className="hidden sm:inline">Download PDF</span>
      </button>

    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
        {label}
      </p>
      <p className="font-bold text-slate-900 text-sm truncate">
        {value || '—'}
      </p>
    </div>
  );
}

/* ============================================================
   5. DOCUMENT CONTENT COMPONENTS
   ============================================================ */
function LessonPlanContent({ content }: { content: any }) {
  return (
    <>
      {/* OBJECTIVES */}
      <Section title="Learning Objectives" icon={<ShieldCheck size={18} />}>
        <ul className="grid gap-2">
          {content.objectives?.map((obj: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, i: React.Key | null | undefined) => (
            <li
              key={i}
              className="
                flex items-start gap-3 text-slate-700 text-sm p-2
                bg-slate-50 rounded-md
                print:bg-transparent print:p-0
              "
            >
              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* PROCEDURE */}
      <Section title="Lesson Procedure" icon={<Layers size={18} />}>
        <div className="border border-slate-200 rounded-lg overflow-hidden print:border-black">

          <table className="w-full text-sm text-left">
            <thead className="
              bg-slate-100 text-slate-600 font-bold uppercase text-[10px]
              tracking-wider border-b border-slate-200
              print:bg-slate-200 print:text-black
            ">
              <tr>
                <th className="p-3 w-16 border-r border-slate-200">Time</th>
                <th className="p-3 w-28 border-r border-slate-200">Step</th>
                <th className="p-3">Activity</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {content.activities?.map((act: { time: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; step: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; teacher_activity: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; learner_activity: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, i: React.Key | null | undefined) => (
                <tr key={i} className="break-inside-avoid">

                  <td className="p-3 font-mono text-xs text-slate-500 align-top border-r border-slate-100">
                    {act.time}
                  </td>

                  <td className="p-3 font-bold text-slate-800 align-top border-r border-slate-100">
                    {act.step}
                  </td>

                  <td className="p-3 align-top">
                    <div className="grid gap-3">
                      <div className="text-sm">
                        <span className="font-bold text-indigo-600 text-xs uppercase mr-2">
                          Teacher
                        </span>
                        {act.teacher_activity}
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-emerald-600 text-xs uppercase mr-2">
                          Learner
                        </span>
                        {act.learner_activity}
                      </div>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </Section>
    </>
  );
}

function SchemeContent({ content }: { content: any }) {
  const weeks = content.weeks || content.rows || [];

  return (
    <Section title="Scheme of Work" icon={<Layers size={18} />}>
      <div className="border border-slate-200 rounded-lg overflow-hidden print:border-black">

        <table className="w-full text-sm text-left">
          <thead className="
            bg-slate-900 text-white text-[10px]
            uppercase tracking-wider
            print:bg-black print:text-white
          ">
            <tr>
              <th className="p-3 w-16 text-center">Week</th>
              <th className="p-3 w-1/4">Topic</th>
              <th className="p-3">Competences & Methods</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 print:divide-black">
            {weeks.map((week: { week: any; week_number: any; topic: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; outcomes: any; specific_competences: any; methods: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, i: React.Key | null | undefined) => (
              <tr key={i} className="even:bg-slate-50 print:even:bg-transparent break-inside-avoid">

                <td className="p-3 font-bold align-top text-center bg-slate-100 print:bg-transparent border-r border-slate-200">
                  {week.week || week.week_number}
                </td>

                <td className="p-3 align-top border-r border-slate-200">
                  <div className="font-bold text-slate-900">{week.topic}</div>
                </td>

                <td className="p-3 text-slate-700 align-top text-xs space-y-2">
                  <div className="mb-2">
                    {week.outcomes || week.specific_competences}
                  </div>
                  <div className="text-slate-500 italic flex items-center gap-1">
                    <span className="font-bold text-[10px] uppercase not-italic text-slate-400">
                      Method:
                    </span>
                    {week.methods}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </Section>
  );
}

function WeeklyContent({ content }: { content: any }) {
  const days = content.days || [];

  return (
    <Section title="Weekly Forecast" icon={<Calendar size={18} />}>
      <div className="space-y-4">
        {days.map((day: { name: any; topic: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; work_covered: any; activities: any; }, i: number) => (
          <div
            key={i}
            className="
              flex border-l-[6px] border-indigo-500 bg-slate-50 p-4
              break-inside-avoid
              print:bg-transparent print:border-black print:border-l-4
            "
          >
            <div className="w-24 font-bold text-indigo-900 uppercase text-xs pt-1 print:text-black">
              {day.name || `Day ${i + 1}`}
            </div>
            <div className="flex-1 pl-4">
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                {day.topic}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed print:text-black">
                {day.work_covered || day.activities}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
   6. SECTION WRAPPER
   ============================================================ */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid mb-6">
      <h3 className="
        flex items-center gap-2 text-slate-900 font-bold text-base mb-4
        border-b-2 border-slate-100 pb-2
        print:border-slate-300
      ">
        <span className="text-indigo-600 print:text-black">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
