import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import NavBar from './NavBar';
import Footer from './Footer';

const PageShell = ({ children, currentPage, navigateTo, setShowBuilder }) => (
  <div className="min-h-screen bg-cream">
    <NavBar currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
    <div className="pt-24">
      {children}
    </div>
    <Footer navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
    <Analytics />
  </div>
);

export default PageShell;
