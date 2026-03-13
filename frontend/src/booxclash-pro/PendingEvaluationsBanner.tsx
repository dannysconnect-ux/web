import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ChevronRight, PenTool } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase'; // Adjust path to your firebase config

export default function PendingEvaluationsBanner() {
  const [pendingLessons, setPendingLessons] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingEvaluations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Fetch all lesson plans for this user
        const q = query(
          collection(db, 'generated_lesson_plans'),
          where('userId', '==', user.uid),
          where('type', '==', 'Lesson Plan')
        );
        
        const querySnapshot = await getDocs(q);
        const now = new Date();
        const pending: any[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const planData = data.planData;
          
          // Skip if it's already evaluated
          if (data.isEvaluated) return;

          // Attempt to parse the date and time End
          try {
            // Expected format: date "YYYY-MM-DD", timeEnd "10:40"
            if (planData?.date) {
              const timeString = planData.timeEnd || "12:00"; 
              const lessonEndTime = new Date(`${planData.date}T${timeString}:00`);
              
              // Check if the lesson's end time is in the past!
              if (lessonEndTime < now) {
                pending.push({ id: doc.id, ...data });
              }
            }
          } catch (e) {
             // Fallback: If date parsing fails, check if the document is older than 24 hours
             const createdAt = data.createdAt?.toDate();
             if (createdAt && (now.getTime() - createdAt.getTime()) > (24 * 60 * 60 * 1000)) {
                 pending.push({ id: doc.id, ...data });
             }
          }
        });

        // Sort by oldest first so they evaluate the oldest lessons first
        setPendingLessons(pending);
      } catch (error) {
        console.error("Error fetching pending evaluations:", error);
      }
    };

    fetchPendingEvaluations();
  }, []);

  if (pendingLessons.length === 0) return null;

  return (
    <div className="bg-rose-500/10 border-2 border-rose-500/30 backdrop-blur-md rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in slide-in-from-top-4">
      <div className="flex items-start sm:items-center gap-4 text-rose-100">
        <div className="p-3 bg-rose-500/20 rounded-full shrink-0 animate-pulse">
          <AlertTriangle size={28} className="text-rose-400" />
        </div>
        <div>
          <h3 className="font-black text-rose-500 text-base sm:text-lg flex items-center gap-2">
            ⚠️ {pendingLessons.length} Lesson{pendingLessons.length > 1 ? 's' : ''} Pending Evaluation
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            You have taught lessons that have not been evaluated. Continuous evaluation is required to track student progress and generate remedial plans.
          </p>
        </div>
      </div>
      
      <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0">
        {pendingLessons.slice(0, 2).map((lesson, idx) => (
          <button 
            key={idx}
            onClick={() => {
              // Navigate to the lesson plan view, passing the loaded document data
              navigate('/lesson-view', { 
                state: { 
                  lessonData: lesson.planData, 
                  meta: lesson, 
                  isLocked: lesson.isLocked,
                  customColumns: lesson.customColumns 
                } 
              });
            }}
            className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-md"
          >
            <div className="flex items-center gap-2 text-left truncate">
                <PenTool size={14} />
                <span className="truncate max-w-[150px]">{lesson.planData?.topic || "Untitled Lesson"}</span>
            </div>
            <div className="flex items-center gap-1 text-rose-200 text-xs">
                <Clock size={12}/> Evaluate <ChevronRight size={14} />
            </div>
          </button>
        ))}
        {pendingLessons.length > 2 && (
            <div className="text-xs text-center text-rose-400 font-bold mt-1">
                + {pendingLessons.length - 2} more pending
            </div>
        )}
      </div>
    </div>
  );
}