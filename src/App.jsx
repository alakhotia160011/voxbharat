import React, { useState, useEffect, useRef } from 'react';
import NavBar from './components/layout/NavBar';
import Footer from './components/layout/Footer';
import HeroSection from './components/landing/HeroSection';
import StatsBar from './components/landing/StatsBar';
import DemoSection from './components/landing/DemoSection';
import HowItWorksSection from './components/landing/HowItWorksSection';
import FeaturesSection from './components/landing/FeaturesSection';
import VideoSection from './components/landing/VideoSection';
import CTASection from './components/landing/CTASection';
import SectionDivider from './components/layout/SectionDivider';
import SampleReportModal from './components/modals/SampleReportModal';
import SampleCallLogModal from './components/modals/SampleCallLogModal';
import { sampleReportData, sampleCallLog } from './data/sampleData';
import FullSurveyBuilder from './components/survey-builder/FullSurveyBuilder';
import HowItWorksPage from './components/pages/HowItWorksPage';
import DataPolicyPage from './components/pages/DataPolicyPage';
import AboutPage, { FaqsPage } from './components/pages/AboutPage';

export default function VoxBharat() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [showSampleReport, setShowSampleReport] = useState(false);
  const [showSampleCallLog, setShowSampleCallLog] = useState(false);

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleLaunch = (config, questions) => {
    console.log('Launching survey:', config, questions);
    alert(`Survey "${config.name}" launched!\n${questions.length} questions\n${config.sampleSize} target responses`);
    setShowBuilder(false);
  };

  // Shared style tag for legacy font classes used by sub-pages and builder
  const styleTag = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@400;500;600;700&display=swap');
      .font-display { font-family: 'Playfair Display', serif; }
      .font-body { font-family: 'DM Sans', sans-serif; }
      .font-serif-indic { font-family: 'Noto Serif Devanagari', serif; }
      .gradient-text {
        background: linear-gradient(135deg, #e8550f 0%, #c24a0e 50%, #e8550f 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .gradient-text-warm {
        background: linear-gradient(135deg, #e8550f 0%, #c24a0e 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
    `}</style>
  );

  // ── Survey Builder (full-screen overlay) ──
  if (showBuilder) {
    return (
      <>
        {styleTag}
        <FullSurveyBuilder onClose={() => setShowBuilder(false)} onLaunch={handleLaunch} />
      </>
    );
  }

  // ── Sub-pages (wrapped in a page shell) ──
  if (currentPage === 'how-it-works') {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        {styleTag}
        <NavBar currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
        <div className="pt-24">
          <HowItWorksPage navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
        </div>
        <Footer navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
      </div>
    );
  }

  if (currentPage === 'about') {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        {styleTag}
        <NavBar currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
        <div className="pt-24">
          <AboutPage navigateTo={navigateTo} />
        </div>
        <Footer navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
      </div>
    );
  }

  if (currentPage === 'faqs') {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        {styleTag}
        <NavBar currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
        <div className="pt-24">
          <FaqsPage navigateTo={navigateTo} />
        </div>
        <Footer navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
      </div>
    );
  }

  if (currentPage === 'data-policy') {
    return (
      <div className="min-h-screen bg-[#faf8f5]">
        {styleTag}
        <NavBar currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
        <div className="pt-24">
          <DataPolicyPage navigateTo={navigateTo} />
        </div>
        <Footer navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
      </div>
    );
  }

  // ── Home page ──
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {styleTag}
      <NavBar currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder} />

      <HeroSection
        onCreateSurvey={() => setShowBuilder(true)}
        onWatchDemo={() => {
          const demoEl = document.getElementById('demo-section');
          if (demoEl) demoEl.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <SectionDivider />
      <StatsBar />
      <SectionDivider />

      <DemoSection
        onShowSampleReport={() => setShowSampleReport(true)}
        onShowSampleCallLog={() => setShowSampleCallLog(true)}
      />

      <SectionDivider />
      <HowItWorksSection />
      <SectionDivider />
      <FeaturesSection />
      <VideoSection />
      <CTASection onCreateSurvey={() => setShowBuilder(true)} />

      <Footer navigateTo={navigateTo} setShowBuilder={setShowBuilder} />

      {/* Modals */}
      <SampleReportModal
        show={showSampleReport}
        onClose={() => setShowSampleReport(false)}
        data={sampleReportData}
        onCreateSurvey={() => { setShowSampleReport(false); setShowBuilder(true); }}
      />
      <SampleCallLogModal
        show={showSampleCallLog}
        onClose={() => setShowSampleCallLog(false)}
        data={sampleCallLog}
      />
    </div>
  );
}
