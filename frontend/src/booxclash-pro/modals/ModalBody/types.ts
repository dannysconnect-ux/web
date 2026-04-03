import { ModalType } from '../types';

export interface ModalFormBodyProps {
  type: ModalType | 'exam' | 'catchup' | any;
  formData: any;
  setFormData: (data: any) => void;
  loadingSubjects: boolean;
  subjectOptions: string[];
  gradeWarning: string | null;
  loadingPlan: boolean;
  fetchWeeklyPlan: () => void;
  availableDays: any[];
  selectedDayIndex: string;
  handleDaySelect: (val: string) => void;
  loadingLessons: boolean;
  availableLessons: any[];
  selectedLessonId: string;
  handleLessonSelect: (val: string) => void;
  availableLevels?: string[];
  availableActivities?: any[];
  isSyllabusGrade?: boolean;
  syllabusStructure?: any[];
  loadingSyllabus?: boolean;
  schemes?: any[];
}