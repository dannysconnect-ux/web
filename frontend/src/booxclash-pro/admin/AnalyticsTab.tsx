import { useMemo } from 'react';
import { TrendingUp, DollarSign, PieChart, AlertCircle, Users, BarChart3, Wallet } from 'lucide-react';
import { IndividualUser } from '../AdminDashboard';

export default function AnalyticsTab({ users, stats }: { users: IndividualUser[], stats: any }) {
  
  const businessMetrics = useMemo(() => {
    let totalPaid = 0; let monthlyCount = 0; let termlyCount = 0;
    let totalHistoricalRevenue = 0; let expiredChurnedCount = 0; let activeSubs = 0;
    const now = new Date();

    users.forEach(u => {
      if (u.last_payment_amount) {
        totalPaid++;
        totalHistoricalRevenue += u.last_payment_amount;
        if (u.last_payment_amount === 50) monthlyCount++;
        else if (u.last_payment_amount === 120) termlyCount++;
      }
      if (u.expiresAt) {
        if (new Date(u.expiresAt) < now) expiredChurnedCount++;
        else activeSubs++;
      }
    });

    const mrr = (monthlyCount * 50) + (termlyCount * (120 / 3));
    const totalEverSubscribed = activeSubs + expiredChurnedCount;
    const churnRate = totalEverSubscribed > 0 ? (expiredChurnedCount / totalEverSubscribed) * 100 : 0;
    const arpu = activeSubs > 0 ? mrr / activeSubs : 0;
    let ltv = (churnRate > 0 && churnRate < 100) ? arpu / (churnRate / 100) : (activeSubs > 0 ? arpu * 12 : 0);

    return { totalPaid, monthlyCount, termlyCount, mrr, totalHistoricalRevenue, activeSubs, expiredChurnedCount, churnRate: churnRate.toFixed(1), arpu: arpu.toFixed(2), ltv: ltv.toFixed(2) };
  }, [users]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* TOP METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* MRR CARD */}
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} className="text-indigo-600"/></div>
                <p className="text-indigo-600 text-sm font-bold uppercase mb-2 flex items-center gap-2"><DollarSign size={16}/> Estimated MRR</p>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">K{businessMetrics.mrr.toLocaleString()}</h2>
            </div>
            
            {/* PAID USERS CARD */}
            <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={80} className="text-emerald-600"/></div>
                <p className="text-emerald-600 text-sm font-bold uppercase mb-2 flex items-center gap-2"><PieChart size={16}/> Total Paid Users</p>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">{businessMetrics.totalPaid}</h2>
                <div className="flex gap-4 mt-3">
                    <div className="bg-white/60 px-3 py-1.5 rounded-lg border border-emerald-200/50 backdrop-blur-sm">
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Termly</span>
                        <span className="text-emerald-600 font-bold">{businessMetrics.termlyCount}</span>
                    </div>
                    <div className="bg-white/60 px-3 py-1.5 rounded-lg border border-emerald-200/50 backdrop-blur-sm">
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Monthly</span>
                        <span className="text-emerald-600 font-bold">{businessMetrics.monthlyCount}</span>
                    </div>
                </div>
            </div>
            
            {/* CHURN RATE CARD */}
            <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle size={80} className="text-rose-600"/></div>
                <p className="text-rose-600 text-sm font-bold uppercase mb-2 flex items-center gap-2"><PieChart size={16}/> Churn Rate</p>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">{businessMetrics.churnRate}%</h2>
                <div className="flex gap-4 mt-3">
                    <div className="bg-white/60 px-3 py-1.5 rounded-lg border border-rose-200/50 backdrop-blur-sm">
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Active</span>
                        <span className="text-emerald-600 font-bold">{businessMetrics.activeSubs}</span>
                    </div>
                    <div className="bg-white/60 px-3 py-1.5 rounded-lg border border-rose-200/50 backdrop-blur-sm">
                        <span className="text-slate-500 text-[10px] block uppercase font-bold">Churned</span>
                        <span className="text-rose-600 font-bold">{businessMetrics.expiredChurnedCount}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* BOTTOM CHARTS & STATS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* UNIT ECONOMICS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Wallet className="text-[#ffa500]" /> Unit Economics</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500 font-medium">Est. LTV</span>
                            <span className="text-emerald-600 font-bold">K{businessMetrics.ltv}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500 font-medium">ARPU (Monthly)</span>
                            <span className="text-indigo-500 font-bold">K{businessMetrics.arpu}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Total All-Time Revenue</div>
                        <div className="text-2xl font-mono font-bold text-slate-900">K{businessMetrics.totalHistoricalRevenue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* PLATFORM OUTPUT */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><BarChart3 className="text-[#6c2dc7]" /> Platform Output</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-2">Total Users</div>
                        <div className="text-3xl font-bold text-slate-900">{stats?.total_users || 0}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-2">Schools</div>
                        <div className="text-3xl font-bold text-slate-900">{stats?.total_schools || 0}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-2">Schemes</div>
                        <div className="text-3xl font-bold text-slate-900">{stats?.total_schemes || 0}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-2">Lessons</div>
                        <div className="text-3xl font-bold text-slate-900">{stats?.total_lessons || 0}</div>
                    </div>
                </div>
            </div>
            
        </div>
    </div>
  );
}