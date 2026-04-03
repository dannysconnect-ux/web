import React, { useMemo } from 'react';

export const SchemeSelectors: React.FC<any> = ({ schemes, formData, setFormData }) => {
  const schemeTopics = useMemo(() => {
    if (!schemes || schemes.length === 0) return [];
    // Smart fallback: use topic name or the first item in content list
    const topics = schemes.map((s: any) => s.topic || (Array.isArray(s.content) ? s.content[0] : s.content));
    return [...new Set(topics)].filter(Boolean);
  }, [schemes]);

  const schemeSubtopics = useMemo(() => {
    if (!formData.topic || !schemes) return [];
    return schemes.filter((s: any) => (s.topic || s.content?.[0]) === formData.topic);
  }, [schemes, formData.topic]);

  const handleSubtopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTitle = e.target.value;
    const weekData = schemes.find((s: any) => {
       const sTitle = s.subtopic || (Array.isArray(s.content) ? s.content[0] : s.content);
       return (s.topic === formData.topic) && sTitle === selectedTitle;
    });

    setFormData({
      ...formData,
      lessonTitle: selectedTitle,
      subtopic: selectedTitle,
      objectives: weekData?.outcomes || weekData?.content || []
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Select Topic from Scheme</label>
        <select 
          className="w-full p-3 bg-white border rounded-lg"
          value={formData.topic}
          onChange={(e) => setFormData({...formData, topic: e.target.value, lessonTitle: ''})}
        >
          <option value="">-- Choose Topic --</option>
          {schemeTopics.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
        </select>
      </div>

      {formData.topic && (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Specific Sub-topic</label>
          <select className="w-full p-3 bg-white border rounded-lg" value={formData.lessonTitle} onChange={handleSubtopicChange}>
            <option value="">-- Choose Sub-topic --</option>
            {schemeSubtopics.map((s: any, idx: number) => {
               const title = s.subtopic || (Array.isArray(s.content) ? s.content[0] : s.content);
               return <option key={idx} value={title}>{title}</option>
            })}
          </select>
        </div>
      )}
    </div>
  );
};