import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, ArrowLeft, Zap, ShieldCheck } from 'lucide-react';

export default function UpgradePage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'termly'>('termly');

  const plans = {
    monthly: {
      title: "Monthly Survival",
      price: "K50",
      period: "/ month",
      generations: 80,
      description: "Perfect for testing the waters and surviving January.",
      features: [
        "80 AI Generations",
        "Schemes of Work",
        "Lesson Plans",
        "Weekly Forecasts",
        "Basic Support"
      ],
      color: "border-slate-700 bg-slate-900/50"
    },
    termly: {
      title: "Termly Boss",
      price: "K120",
      period: "/ term",
      generations: 300,
      description: "Best Value. Pay once, relax for 3 months.",
      features: [
        "300 AI Generations",
        "Everything in Monthly",
        "Priority Generation Speed",
        "Save K30 instantly",
        "Premium Support"
      ],
      color: "border-emerald-500 bg-emerald-900/20 ring-1 ring-emerald-500"
    }
  };

  const handlePaymentClick = (planName: string, amount: string) => {
    // In a real app, this would trigger a Mobile Money SDK
    const message = `Hello Teacher Koko! I want to pay ${amount} for the ${planName} plan on BooxClash.`;
    const whatsappUrl = `https://wa.me/260967001972?text=${encodeURIComponent(message)}`; // Replace with your number
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-8 flex flex-col items-center">
      
      {/* Back Button */}
      <div className="w-full max-w-4xl mb-8">
        <button 
            onClick={() => navigate('/teacher-dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
            <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Invest in your <span className="text-emerald-500">Peace of Mind</span>
        </h1>
        <p className="text-slate-400 text-lg">
            Stop writing by hand. Unlock the full power of BooxClash Pro.
        </p>
      </div>

      {/* Pricing Toggle (Optional UI flair) */}
      <div className="flex bg-slate-900 p-1 rounded-xl mb-12 border border-slate-800">
        <button 
            onClick={() => setSelectedPlan('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedPlan === 'monthly' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
        >
            Monthly (K50)
        </button>
        <button 
            onClick={() => setSelectedPlan('termly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedPlan === 'termly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
        >
            Termly (K120) <span className="text-[10px] bg-white/20 px-1.5 rounded text-white">SAVE</span>
        </button>
      </div>

      {/* Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        
        {/* Monthly Card */}
        <div 
            onClick={() => setSelectedPlan('monthly')}
            className={`relative p-8 rounded-3xl border transition-all cursor-pointer ${
                selectedPlan === 'monthly' ? plans.monthly.color + ' scale-[1.02]' : 'border-slate-800 bg-slate-900/20 opacity-70 hover:opacity-100'
            }`}
        >
            <h3 className="text-xl font-bold text-slate-300 mb-2">{plans.monthly.title}</h3>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">{plans.monthly.price}</span>
                <span className="text-slate-500">{plans.monthly.period}</span>
            </div>
            <p className="text-slate-400 mb-8 h-12">{plans.monthly.description}</p>
            
            <ul className="space-y-4 mb-8">
                {plans.monthly.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                        <Check size={18} className="text-emerald-500" />
                        {feat}
                    </li>
                ))}
            </ul>

            <button 
                onClick={(e) => { e.stopPropagation(); handlePaymentClick("Monthly", "K50"); }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700"
            >
                Choose Monthly
            </button>
        </div>

        {/* Termly Card */}
        <div 
            onClick={() => setSelectedPlan('termly')}
            className={`relative p-8 rounded-3xl border transition-all cursor-pointer ${
                selectedPlan === 'termly' ? plans.termly.color + ' scale-[1.02] shadow-2xl shadow-emerald-900/20' : 'border-slate-800 bg-slate-900/20 opacity-70 hover:opacity-100'
            }`}
        >
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                MOST POPULAR
            </div>

            <h3 className="text-xl font-bold text-emerald-400 mb-2 flex items-center gap-2">
                {plans.termly.title} <Crown size={18} />
            </h3>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">{plans.termly.price}</span>
                <span className="text-slate-500">{plans.termly.period}</span>
            </div>
            <p className="text-slate-400 mb-8 h-12">{plans.termly.description}</p>
            
            <ul className="space-y-4 mb-8">
                {plans.termly.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-200">
                        <div className="p-1 rounded-full bg-emerald-500/20">
                            <Check size={14} className="text-emerald-500" />
                        </div>
                        {feat}
                    </li>
                ))}
            </ul>

            <button 
                onClick={(e) => { e.stopPropagation(); handlePaymentClick("Termly", "K120"); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-lg shadow-emerald-900/40"
            >
                Get Termly Access
            </button>
        </div>

      </div>

      {/* Trust Badges */}
      <div className="mt-16 flex gap-8 text-slate-500 grayscale opacity-50">
        <div className="flex items-center gap-2"><Zap size={20} /> Instant Activation</div>
        <div className="flex items-center gap-2"><ShieldCheck size={20} /> Secure Mobile Money</div>
      </div>

    </div>
  );
}
