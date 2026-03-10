import React, { useState, useEffect, Suspense, lazy } from 'react';
import ErrorBoundary from './components/shared/ErrorBoundary';
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
import CallMeWidget from './components/landing/CallMeWidget';

// Lazy-loaded pages — split into separate chunks
const FullSurveyBuilder = lazy(() => import('./components/survey-builder/FullSurveyBuilder'));
const HowItWorksPage = lazy(() => import('./components/pages/HowItWorksPage'));
const DataPolicyPage = lazy(() => import('./components/pages/DataPolicyPage'));
const AboutPage = lazy(() => import('./components/pages/AboutPage'));
const FaqsPage = lazy(() => import('./components/pages/AboutPage').then(m => ({ default: m.FaqsPage })));
const DashboardPage = lazy(() => import('./components/pages/DashboardPage'));
const MemoPage = lazy(() => import('./components/pages/MemoPage'));
const ResetPasswordPage = lazy(() => import('./components/pages/ResetPasswordPage'));
const ApiDocsPage = lazy(() => import('./components/pages/ApiDocsPage'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-cream flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function VoxBharat() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '') || 'home';
    return path;
  });
  const [showSampleReport, setShowSampleReport] = useState(false);
  const [showSampleCallLog, setShowSampleCallLog] = useState(false);

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.history.pushState(null, '', page === 'home' ? '/' : `/${page}`);
    window.scrollTo(0, 0);
  };

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/^\//, '') || 'home';
      setCurrentPage(path);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleLaunch = (config, questions) => {
    alert(`Survey "${config.name}" launched!\n${questions.length} questions\n${config.sampleSize} target responses`);
    setShowBuilder(false);
  };

  // ── Survey Builder (full-screen overlay) ──
  if (showBuilder) {
    return (
      <ErrorBoundary><Suspense fallback={<PageLoader />}>
        <FullSurveyBuilder onClose={() => setShowBuilder(false)} onLaunch={handleLaunch} />
      </Suspense></ErrorBoundary>
    );
  }

  // ── Sub-pages (wrapped in PageShell) ──
  if (currentPage === 'how-it-works') {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <HowItWorksPage navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  if (currentPage === 'about') {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <AboutPage navigateTo={navigateTo} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  if (currentPage === 'faqs') {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <FaqsPage navigateTo={navigateTo} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  if (currentPage === 'memo') {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <MemoPage navigateTo={navigateTo} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  if (currentPage === 'dashboard') {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <DashboardPage setShowBuilder={setShowBuilder} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  if (currentPage.startsWith('reset-password')) {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <ResetPasswordPage navigateTo={navigateTo} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  if (currentPage === 'api-docs') {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <ApiDocsPage navigateTo={navigateTo} setShowBuilder={setShowBuilder} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  if (currentPage === 'data-policy') {
    return (
      <>
        <ErrorBoundary><Suspense fallback={<PageLoader />}>
          <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
            <DataPolicyPage navigateTo={navigateTo} />
          </PageShell>
        </Suspense></ErrorBoundary>
        <CallMeWidget />
      </>
    );
  }

  // ── 404 — unknown routes ──
  const knownPages = ['home', 'how-it-works', 'about', 'faqs', 'memo', 'dashboard', 'api-docs', 'data-policy'];
  if (currentPage !== 'home' && !knownPages.includes(currentPage) && !currentPage.startsWith('reset-password')) {
    return (
      <>
        <PageShell currentPage={currentPage} navigateTo={navigateTo} setShowBuilder={setShowBuilder}>
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
            <p className="font-display text-6xl font-bold text-earth mb-4">404</p>
            <p className="font-body text-earth-mid text-lg mb-6">Page not found</p>
            <button
              onClick={() => navigateTo('home')}
              className="px-6 py-3 bg-saffron text-white rounded-full font-body hover:bg-saffron/90 transition-colors"
            >
              Go Home
            </button>
          </div>
        </PageShell>
        <CallMeWidget />
      </>
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
      <CallMeWidget />
    </div>
  );
}
