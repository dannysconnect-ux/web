export const bloomsLevels = [
  { level: "Remembering", desc: "Recall facts and basic concepts" },
  { level: "Understanding", desc: "Explain ideas or concepts" },
  { level: "Applying", desc: "Use information in new situations" },
  { level: "Analyzing", desc: "Draw connections among ideas" },
  { level: "Evaluating", desc: "Justify a stand or decision" },
  { level: "Creating", desc: "Produce new or original work" }
];

export const EXAM_QUESTION_TYPES = [
  { id: 'mcq', label: 'Multiple Choice', default: 0, max: 50 },
  { id: 'true_false', label: 'True / False', default: 0, max: 30 },
  { id: 'matching', label: 'Matching Pairs', default: 0, max: 5 },
  { id: 'short_answer', label: 'Short Answer', default: 0, max: 30 },
  { id: 'computational', label: 'Problem Solving', default: 0, max: 20 },
  { id: 'essay', label: 'Essay / Open', default: 0, max: 10 },
  { id: 'case_study', label: 'Case Study', default: 0, max: 5 }
];