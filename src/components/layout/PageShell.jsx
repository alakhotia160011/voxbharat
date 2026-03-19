import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import NavBar from './NavBar';
import Footer from './Footer';

const PageShell = ({ children }) => (
  <div className="min-h-screen bg-cream">
    <NavBar />
    <div className="pt-24">
      {children}
    </div>
    <Footer />
    <Analytics />
  </div>
);

export default PageShell;
