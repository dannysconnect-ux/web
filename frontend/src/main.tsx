import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import "./index.css";

// --- 1. STATIC IMPORTS (Keep these fast for SEO and initial load) ---
import HomePage from './HomePage';
import Login from './booxclash-pro/school/Login';
import Signup from './booxclash-pro/school/SchoolSignUp';
import AboutUs from './AboutUs';
import Contact from './Contact';
import Pricing from './Pricing';
import Features from './Features';
import EmailPage from './booxclash-pro/school/EmailPage';
import SBAManager from './booxclash-pro/school/SBAManager';
import TeacherSBAManager from './booxclash-pro/school/TeacherSBAManager';
import StudentPerformanceDashboard from './booxclash-pro/school/StudentPerformanceDashboard';
import ExamView from './booxclash-pro/ExamView';
import CatchupView from './booxclash-pro/CatchupView';
import AgentDashboard from './booxclash-pro/AgentDashboard';
import StudentDashboard from './booxclash-pro/StudentDashboard';
import WrittenAssessment from './booxclash-pro/school/Written';
import OralAssessment from './booxclash-pro/school/Oral';
import Dashboard from './booxclash-pro/school/copilot/Dashboard';

// --- 2. LAZY IMPORTS (Heavy "App" pages load only on demand) ---
const TeacherDashboard = lazy(() => import('./booxclash-pro/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./booxclash-pro/AdminDashboard'));
const SchoolPortal = lazy(() => import('./booxclash-pro/school/SchoolPortal'));
const SmartDocumentView = lazy(() => import('./booxclash-pro/SmartDocumentView')); 
const Schemes = lazy(() => import('./booxclash-pro/Schemes'));
const WeeklyView = lazy(() => import('./booxclash-pro/WeeklyView'));
const LessonPlanView = lazy(() => import('./booxclash-pro/LessonPlanView'));
const MakeYourOwn = lazy(() => import('./booxclash-pro/MakeYourOwn'));
const UpgradePage = lazy(() => import('./booxclash-pro/Upgrade'));
const SignupBooxclashPro = lazy(() => import('./booxclash-pro/SignupBooxclashPro'));
const SchoolSignup = lazy(() => import('./booxclash-pro/school/SchoolSignUp'));

// Legacy/Old Components
const OldLessonPlanView = lazy(() => import('./booxclash-pro/old/OldLessonPlanView'));
const OldSchemes = lazy(() => import('./booxclash-pro/old/OldSchemes'));
const OldWeeklyView = lazy(() => import('./booxclash-pro/old/OldWeeklyView'));

// --- LOADING SPINNER ---
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
      <p className="animate-pulse text-sm font-medium text-purple-600">Loading BooxClash...</p>
    </div>
  </div>
);

// --- 🔒 PROTECTED ROUTE GATEKEEPER ---
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const token = sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("userRole"); 

  // 1. Not logged in at all? Kick to login page.
  if (!token) {
    return <Navigate to="/home-booxclash-pro" replace />;
  }

  // 2. Needs admin but user is not admin? Kick to normal portal.
  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/home-booxclash-pro" replace />;
  }

  // 3. Authorized! Render the page.
  return <>{children}</>;
};

// --- INITIAL GATEKEEPER COMPONENT ---
const AppEntry: React.FC = () => {
    const parentToken = sessionStorage.getItem("token");
    const childDataJSON = sessionStorage.getItem("childData");

    if (parentToken && childDataJSON) {
        const child = JSON.parse(childDataJSON);
        return <Navigate to={`/FoundationDashboard/${child.curriculum}/${child.subject}/${child.childGrade}`} replace />;
    } else if (parentToken) {
        return <Navigate to="/child-selector" replace />;
    } else {
        return <Navigate to="/home" replace />;
    }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ROOT */}
          <Route path="/" element={<AppEntry />} />
          
          {/* ========================================= */}
          {/* 🟢 PUBLIC ROUTES                            */}
          {/* ========================================= */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/school-signup" element={<SchoolSignup />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/written" element={<WrittenAssessment />} />
          <Route path="/oral" element={<OralAssessment />} />
          <Route path="/home-booxclash-pro" element={<SignupBooxclashPro />} />


          {/* ========================================= */}
          {/* 🟡 UNPROTECTED VIEWS (Removed Protection)   */}
          {/* ========================================= */}
          
          {/* Dashboards & Portals */}
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/school-portal" element={<SchoolPortal />} />
          <Route path="/student-reports" element={<StudentPerformanceDashboard />} />
          
          {/* SBA Management */}
          <Route path="/sba" element={<SBAManager />} />
          <Route path="/teacher-sba" element={<TeacherSBAManager />} />
          <Route path="/catchup-copilot" element={<Dashboard />} />

          {/* Tools & Views */}
          <Route path="/schemes" element={<Schemes />} />
          <Route path="/lesson-view" element={<LessonPlanView />} />
          <Route path="/weekly-view" element={<WeeklyView />} />
          <Route path="/smart-view" element={<SmartDocumentView />} />
          <Route path="/make-your-own" element={<MakeYourOwn />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/exam-view" element={<ExamView />} />
          <Route path="/catchup-view" element={<CatchupView />} />
          <Route path="/agent-dashboard" element={<AgentDashboard />} />
          {/* Legacy Tools */}
          <Route path="/old-schemes" element={<OldSchemes />} />
          <Route path="/old-lesson-plan-view" element={<OldLessonPlanView />} />
          <Route path="/old-weekly-view" element={<OldWeeklyView />} />
          <Route path="/students" element={<StudentDashboard />} />


          {/* ========================================= */}
          {/* 🔴 STRICT ADMIN ROUTES (Admin Role Needed)  */}
          {/* ========================================= */}
          <Route path="/admin-dashboard" element={

              <AdminDashboard />
          } />
          
          <Route path="/admin/emails" element={
            <ProtectedRoute requireAdmin={true}>
              <EmailPage />
            </ProtectedRoute>
          } />

        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);