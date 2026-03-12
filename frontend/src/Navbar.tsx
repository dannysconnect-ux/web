import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { navLinks } from "./constants/navBarLinks";
import { Menu, X, ArrowRight, Lock } from "lucide-react";
import logo from "/images/logo.png"; 

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen((prev) => !prev);

  // Add background blur effect only when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled 
          // Light background with a subtle orange shadow on scroll
          ? "bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(255,165,0,0.15)] border-slate-200 py-3" 
          : "bg-transparent border-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center">
          
          {/* --- LOGO --- */}
          <Link
            to="/"
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
            onClick={() => setIsOpen(false)}
          >
            <img 
              src={logo} 
              alt="BooxClash Logo" 
              className="w-32 h-auto object-contain" 
            />
          </Link>

          {/* --- DESKTOP NAVIGATION --- */}
          <nav className="hidden md:flex items-center gap-8">
            <ul className="flex gap-8">
              {navLinks.map(({ id, href, name }) => {
                const isActive = location.pathname === href;
                return (
                  <li key={id}>
                    <Link
                      to={href}
                      className={`text-sm font-medium transition-colors duration-200 ${
                        isActive 
                          ? "text-[#ffa500]" 
                          : "text-slate-600 hover:text-[#ffa500]" // Changed to slate-600 for light bg
                      }`}
                    >
                      {name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* --- DESKTOP ACTION BUTTONS --- */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/home-booxclash-pro" 
              className="text-slate-600 hover:text-[#ffa500] text-sm font-medium flex items-center gap-2 px-4 py-2 transition-colors"
            >
              <Lock size={16} />
              Login
            </Link>
            <Link 
              to="/home-booxclash-pro" 
              // Enhanced the orange shadow here
              className="bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 text-sm font-bold px-6 py-2.5 rounded-full transition-all hover:scale-105 shadow-[0_4px_14px_rgba(255,165,0,0.4)] flex items-center gap-2"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* --- MOBILE MENU TOGGLE --- */}
          <button
            onClick={toggleMenu}
            className="text-slate-900 focus:outline-none md:hidden p-2 hover:text-[#ffa500] transition-colors"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* --- MOBILE NAVIGATION DRAWER --- */}
      <div
        className={`fixed inset-0 z-40 bg-[#f0fff0] transform transition-transform duration-300 ease-in-out md:hidden flex flex-col pt-24 px-6 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ul className="flex flex-col gap-6 text-center">
          {navLinks.map(({ id, href, name }) => {
             const isActive = location.pathname === href;
             return (
               <li key={id}>
                 <Link
                   to={href}
                   className={`text-xl font-medium block py-2 transition-colors ${
                     isActive 
                       ? "text-[#ffa500]" 
                       : "text-slate-600 hover:text-[#ffa500]"
                   }`}
                   onClick={() => setIsOpen(false)}
                 >
                   {name}
                 </Link>
               </li>
             );
          })}
        </ul>

        <div className="mt-12 flex flex-col gap-4">
          <Link
            to="/home-booxclash-pro"
            onClick={() => setIsOpen(false)}
            className="w-full py-4 text-center text-slate-700 hover:text-[#ffa500] hover:border-[#ffa500]/50 font-medium border border-slate-300 rounded-xl transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/home-booxclash-pro"
            onClick={() => setIsOpen(false)}
            className="w-full py-4 text-center bg-[#ffa500] hover:bg-[#ffa500]/90 text-slate-900 font-bold rounded-xl shadow-[0_4px_14px_rgba(255,165,0,0.4)] transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;