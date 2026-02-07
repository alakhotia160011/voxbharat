import React from 'react';
import NavBar from './NavBar';
import Footer from './Footer';

const PageShell = ({ children, currentPage, navigateTo, setShowBuilder }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#fff9f0] to-[#f5f0e8]">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      .font-display { font-family: 'Cormorant Garamond', serif; }
      .font-body { font-family: 'DM Sans', sans-serif; }
      .gradient-text {
        background: linear-gradient(135deg, #ff6b2c 0%, #e85d04 50%, #ffaa80 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .gradient-text-warm {
        background: linear-gradient(135deg, #e8550f 0%, #cc4400 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
    `}</style>
    <NavBar currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
    <div className="pt-24">
      {children}
    </div>
    <Footer navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
  </div>
);

export default PageShell;
