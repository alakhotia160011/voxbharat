import React, { useState } from 'react';
import NavBar from './components/layout/NavBar';
import Footer from './components/layout/Footer';
import PageShell from './components/layout/PageShell';
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
import DashboardPage from './components/pages/DashboardPage';


export default function VoxBharat() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'home';
  });
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

  // ── Survey Builder (full-screen overlay) ──
  if (showBuilder) {
    return (
      <FullSurveyBuilder onClose={() => setShowBuilder(false)} onLaunch={handleLaunch} />
    );
  }

  // ── Sub-pages (wrapped in PageShell) ──
  if (currentPage === 'how-it-works') {
    return (
      <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
        <HowItWorksPage navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
      </PageShell>
    );
  }

  if (currentPage === 'about') {
    return (
      <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
        <AboutPage navigateTo={navigateTo} />
      </PageShell>
    );
  }

  if (currentPage === 'faqs') {
    return (
      <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
        <FaqsPage navigateTo={navigateTo} />
      </PageShell>
    );
  }

if (currentPage === 'dashboard') {
    return (
      <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
        <DashboardPage setShowBuilder={setShowBuilder} />
      </PageShell>
    );
  }

  if (currentPage === 'data-policy') {
    return (
      <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
        <DataPolicyPage navigateTo={navigateTo} />
      </PageShell>
    );
  }

  // ── Home page ──
  return (
    <div className="min-h-screen bg-cream">
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
