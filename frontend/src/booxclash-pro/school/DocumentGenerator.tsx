import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  FileText, Users, Calendar, Clock, Search, 
  Download, ChevronDown, BookOpen, Layers, ClipboardCheck, Loader2 
} from 'lucide-react';

const Analytics = () => {
  // --- STATE MANAGEMENT ---
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'year'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        // Retrieve School ID from local storage or auth context if needed
        const schoolId = localStorage.getItem('schoolId') || ''; 

        const response = await fetch(`http://localhost:8000/api/v1/analytics/dashboard?time_range=${timeRange}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-School-ID': schoolId // Pass header if your API requires it
          }
        });

        if (!response.ok) throw new Error('Failed to fetch analytics');
        
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]); // Re-fetch when time range changes

  // --- HELPER FUNCTIONS ---
  const getIcon = (type: string) => {
    switch(type) {
      case 'lesson': return <BookOpen size={16} className="text-blue-500" />;
      case 'scheme': return <Layers size={16} className="text-emerald-500" />;
      case 'weekly': return <Calendar size={16} className="text-purple-500" />;
      case 'record': return <ClipboardCheck size={16} className="text-orange-500" />;
      default: return <FileText size={16} className="text-slate-500" />;
    }
  };

  // --- CLIENT-SIDE FILTERING (For the Table) ---
  // The API returns the top 20 recent activities. We filter that list locally for search.
  const filteredRecords = dashboardData?.recent_activity.filter((item: any) => {
    const matchesSearch = 
      item.teacher.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.school.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  // --- LOADING STATE ---
  if (loading && !dashboardData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Generation Analytics</h1>
          <p className="text-slate-500 text-sm">Overview of teacher activity and content generation.</p>
        </div>
        
        <div className="flex gap-2">
           <div className="flex bg-white border border-slate-200 rounded-lg p-1">
             {['week', 'month', 'year'].map((range) => (
               <button 
                 key={range}
                 onClick={() => setTimeRange(range)}
                 className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                   timeRange === range ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'
                 }`}
               >
                 {range}
               </button>
             ))}
           </div>
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
             <Download size={16} />
             Export Report
           </button>
        </div>
      </div>

      {/* METRIC CARDS - Dynamic Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dashboardData.stats.map((stat: any, index: number) => (
          <MetricCard 
            key={index}
            title={stat.title} 
            value={stat.value} 
            trend={stat.trend} 
            sub={stat.sub}
            // Map icons based on title for now (or send icon key from backend)
            icon={
              stat.title.includes("Total") ? <FileText className="text-blue-600" /> :
              stat.title.includes("Active") ? <Users className="text-emerald-600" /> :
              stat.title.includes("Subject") ? <BookOpen className="text-purple-600" /> :
              <Clock className="text-orange-600" />
            }
            bg={
              stat.title.includes("Total") ? "bg-blue-50" :
              stat.title.includes("Active") ? "bg-emerald-50" :
              stat.title.includes("Subject") ? "bg-purple-50" :
              "bg-orange-50"
            } 
          />
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Main Bar Chart - Dynamic Data */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Generation Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.chart_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="docs" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Dynamic Data */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-2">Document Types</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.type_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dashboardData.type_distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
               <span className="text-2xl font-bold text-slate-800">
                 {dashboardData.stats.find((s:any) => s.title === "Total Documents")?.value || 0}
               </span>
               <span className="text-xs text-slate-500">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED TABLE SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold">Recent Generations</h3>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search teacher, school..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <select 
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none cursor-pointer"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="lesson">Lesson Plans</option>
                <option value="scheme">Schemes</option>
                <option value="weekly">Weekly Plans</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* The Table - Dynamic Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4">Document Type</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">School Label</th>
                <th className="px-6 py-4 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                          {row.teacher.charAt(0)}
                        </div>
                        {row.teacher}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getIcon(row.type)}
                        <span className="capitalize">{row.type.replace('_', ' ')} Plan</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{row.subject}</span>
                        <span className="text-xs text-slate-400">{row.grade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 italic">
                      {row.school}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-slate-700">{row.date}</span>
                        <span className="text-xs text-slate-400">{row.time}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No recent records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>Showing {filteredRecords.length} recent records</span>
          {/* Pagination is usually server-side, disabled for now */}
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Next</button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper Subcomponent (Unchanged logic, just ensure props are passed correctly)
const MetricCard = ({ title, value, trend, icon, bg, sub }: any) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {sub ? (
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      ) : (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded mt-2 ${
           trend === 'stable' ? 'text-slate-600 bg-slate-100' : 'text-emerald-600 bg-emerald-50'
        }`}>
          {trend}
        </span>
      )}
    </div>
    <div className={`p-3 rounded-lg ${bg}`}>
      {icon}
    </div>
  </div>
);

export default Analytics;