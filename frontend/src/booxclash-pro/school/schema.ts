import { FieldValue, Timestamp } from "firebase/firestore";

// ==========================================
// 🏫 1. SCHOOLS (Main Collection)
// Path: /schools/{schoolId}
// ==========================================
export interface SchoolData {
  id?: string;
  name: string;
  email: string;
  motto: string;
  address: string;
  phone: string;
  logoUrl?: string;
  adminId: string; 
  credits: number;
  maxTeachers: number;
  createdAt: FieldValue | Timestamp;
}

// ==========================================
// 👇 SUBCOLLECTIONS (Inside a specific School)
// ==========================================

// 👩‍🏫 TEACHERS
// Path: /schools/{schoolId}/teachers/{teacherId}
export interface TeacherData {
  id?: string;
  schoolId: string; // Good to keep as a backup reference
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  loginCode: string; // e.g. T-BANDA-882
  pin: string;
  createdAt: FieldValue | Timestamp;
}

// 📚 CLASSES
// Path: /schools/{schoolId}/classes/{classId}
export interface ClassData {
  id?: string;
  schoolId: string;
  name: string;      
  grade: string;
  code: string;      // 6-character Teacher Join Code
  subjects: string[];
  studentCount: number;
  rosterFilename?: string;
  createdAt: FieldValue | Timestamp;
}

// 👦👧 STUDENTS
// Path: /schools/{schoolId}/students/{studentId}
export interface StudentData {
  id?: string;
  schoolId: string; 
  classId: string;  
  name: string;
  createdAt: FieldValue | Timestamp;
}

// 📝 SBA TASKS
// Path: /schools/{schoolId}/sba_tasks/{taskId}
export interface SBATaskData {
  id?: string;
  schoolId: string; 
  classId: string;
  term: string;
  rubric: string;
  description: string;
  teacherId: string;
  subject: string;
  title: string;
  type: string;     
  maxScore: number;
  content: any; // The Gemini JSON
  createdAt: FieldValue | Timestamp;
}