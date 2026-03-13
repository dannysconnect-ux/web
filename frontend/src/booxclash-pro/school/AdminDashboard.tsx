import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { UserPlus, FileUp, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newTeacherName, setNewTeacherName] = useState("");
  
  // Fetch School ID on load
  useEffect(() => {
    const fetchSchool = async () => {
      const user = auth.currentUser;
      if(user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if(userDoc.exists()) {
            setSchoolId(userDoc.data().schoolId);
            loadTeachers(userDoc.data().schoolId);
        }
      }
    };
    fetchSchool();
  }, []);

  const loadTeachers = async (id: string) => {
    const q = query(collection(db, "teachers"), where("schoolId", "==", id));
    const snapshot = await getDocs(q);
    setTeachers(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const handleAddTeacher = async () => {
    if(!newTeacherName || !schoolId) return;

    // Generate Simple Credentials
    const loginId = `${newTeacherName.split(' ')[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    await addDoc(collection(db, "teachers"), {
      schoolId,
      name: newTeacherName,
      loginId,
      pin,
      createdAt: new Date()
    });

    setNewTeacherName("");
    loadTeachers(schoolId);
    alert(`Created! Login ID: ${loginId}, PIN: ${pin}`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT: CURRICULUM SETUP (Step 4 & 5) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><FileUp size={24} /></div>
            <h2 className="text-xl font-bold">Curriculum Template</h2>
          </div>
          <p className="text-slate-500 mb-6">Upload your PDF scheme to generate the custom lesson plan form for your teachers.</p>
          <button className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition">
            + Upload PDF Template
          </button>
        </div>

        {/* RIGHT: TEACHER MANAGEMENT (Step 6) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><Users size={24} /></div>
            <h2 className="text-xl font-bold">Manage Teachers</h2>
          </div>

          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Teacher Name (e.g. Mr. Banda)" 
              className="flex-1 border p-2 rounded-lg"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
            />
            <button onClick={handleAddTeacher} className="bg-slate-900 text-white px-4 rounded-lg flex items-center gap-2">
              <UserPlus size={18} /> Add
            </button>
          </div>

          <div className="space-y-2">
            {teachers.map((t) => (
              <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-medium">{t.name}</span>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Login ID</div>
                  <div className="font-mono font-bold text-indigo-600">{t.loginId}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}