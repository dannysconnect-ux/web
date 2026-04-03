import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase'; 
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, BookOpen, Clock, CheckCircle2 } from 'lucide-react';

export default function PendingEvaluationsBanner() {
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvaluations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const lessonsRef = collection(db, 'generated_lesson_plans');
        
        // Note: Check your database if you use 'uid' or 'userId' to save the user's ID.
        // I kept 'userId' as fallback just in case based on standard setups.
        const q = query(
          lessonsRef,
          where('userId', '==', user.uid), 
          orderBy('createdAt', 'desc'),
          limit(15) 
        );

        const snapshot = await getDocs(q);
        const fetchedLessons: any[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const type = data.type || '';
          
          // Only pull in documents that are actually lesson plans
          if (type === 'lesson' || type === 'Lesson Plan' || type === 'Remedial Lesson Plan') {
             fetchedLessons.push({ id: doc.id, ...data });
          }
        });

        // If 'userId' query fails and returns 0, you might be using 'uid' in your database. 
        // If so, change 'userId' back to 'uid' in the query above!
        setRecentLessons(fetchedLessons);
      } catch (error) {
        console.error("Error fetching evaluations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, []);

  if (loading || recentLessons.length === 0) return null;

  const handleReviewClick = (lesson: any) => {
    const gradeStr = lesson.grade || "";
    const oldGrades = ["3", "5", "6", "7", "10", "11", "12"];
    const normalized = gradeStr.toString().trim().toLowerCase().replace(/[^0-9]/g, '');
    const isOld = oldGrades.includes(normalized);

    const route = isOld ? '/old-lesson-plan-view' : '/lesson-view';
    
    navigate(route, {
      state: {
        lessonData: lesson.planData || lesson.lessonData || lesson.data || lesson,
        meta: { docId: lesson.id, ...lesson },
        isLocked: lesson.isLocked,
        customColumns: lesson.customColumns
      }
    });
  };

  const pendingCount = recentLessons.filter(l => !l.isEvaluated && (!l.evaluation_status || l.evaluation_status === 'pending')).length;

  return (
    <div className="mb-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${pendingCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {pendingCount > 0 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">
            Lesson Evaluations {pendingCount > 0 && <span className="text-orange-600">({pendingCount} Pending)</span>}
          </h3>
          <p className="text-sm text-slate-600">Track your recent lessons and provide AI feedback.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {recentLessons.map((lesson) => {
          // Check if it is evaluated
          const isEvaluated = lesson.isEvaluated === true || 
                              lesson.evaluation_status === 'success' || 
                              lesson.evaluation_status === 'needs_remedial' || 
                              lesson.evaluation_status === 'failed';

          // Set dynamic styles based on status
          const cardStyle = isEvaluated 
            ? "bg-emerald-50 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center group"
            : "bg-white border border-orange-200 hover:border-orange-400 hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center group";

          const iconColor = isEvaluated ? "text-emerald-500" : "text-orange-500";
          const statusTextColor = isEvaluated ? "text-emerald-600" : "text-orange-600";
          const chevronColor = isEvaluated ? "text-emerald-300 group-hover:text-emerald-600" : "text-orange-300 group-hover:text-orange-600";

          return (
            <div 
              key={lesson.id} 
              onClick={() => handleReviewClick(lesson)}
              className={`p-4 rounded-xl ${cardStyle}`}
            >
              <div className="overflow-hidden">
                <div className={`flex items-center gap-2 text-xs font-bold mb-1 ${iconColor}`}>
                  <BookOpen size={14} />
                  {lesson.subject} • {lesson.grade}
                </div>
                <p className="font-semibold text-slate-800 truncate text-sm">
                  {lesson.topic || lesson.planData?.topic || "Untitled Lesson"}
                </p>
                
                {/* Dynamic Status Indicator */}
                <p className={`text-xs mt-1 flex items-center gap-1 font-bold ${statusTextColor}`}>
                  {isEvaluated ? (
                    <><CheckCircle2 size={12} /> Evaluated</>
                  ) : (
                    <><Clock size={12} /> Pending Evaluation</>
                  )}
                </p>
              </div>
              <ChevronRight className={`transition-colors ${chevronColor}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}