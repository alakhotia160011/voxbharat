import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/shared/ErrorBoundary';
import PageShell from './components/layout/PageShell';
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
import CallMeWidget from './components/landing/CallMeWidget';
import { useBuilder } from './contexts/BuilderContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './pages/DashboardLayout';

// Lazy-loaded pages
const FullSurveyBuilder = lazy(() => import('./components/survey-builder/FullSurveyBuilder'));
const HowItWorksPage = lazy(() => import('./components/pages/HowItWorksPage'));
const DataPolicyPage = lazy(() => import('./components/pages/DataPolicyPage'));
const AboutPage = lazy(() => import('./components/pages/AboutPage'));
const FaqsPage = lazy(() => import('./components/pages/AboutPage').then(m => ({ default: m.FaqsPage })));
const MemoPage = lazy(() => import('./components/pages/MemoPage'));
const ResetPasswordPage = lazy(() => import('./components/pages/ResetPasswordPage'));
const ApiDocsPage = lazy(() => import('./components/pages/ApiDocsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Dashboard views
const OverviewPage = lazy(() => import('./pages/dashboard/OverviewPage'));
const SurveysPage = lazy(() => import('./pages/dashboard/SurveysPage'));
const SurveyDetailPage = lazy(() => import('./pages/dashboard/SurveyDetailPage'));
const CallLogsPage = lazy(() => import('./pages/dashboard/CallLogsPage'));
const CampaignsPage = lazy(() => import('./pages/dashboard/CampaignsPage'));
const InsightsPage = lazy(() => import('./pages/dashboard/InsightsPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const InboundPage = lazy(() => import('./pages/dashboard/InboundPage'));

const PageLoader = () => (
  <div className="min-h-screen bg-cream flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
  </div>
);

function PageWrap({ children }) {
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <PageShell>{children}</PageShell>
        </Suspense>
      </ErrorBoundary>
      <CallMeWidget />
    </>
  );
}

function HomePage() {
  const { setShowBuilder } = useBuilder();
  const [showSampleReport, setShowSampleReport] = useState(false);
  const [showSampleCallLog, setShowSampleCallLog] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

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

      <Footer />

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

function NotFound() {
  return (
    <PageWrap>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <p className="font-display text-6xl font-bold text-earth mb-4">404</p>
        <p className="font-body text-earth-mid text-lg mb-6">Page not found</p>
        <a
          href="/"
          className="px-6 py-3 bg-saffron text-white rounded-full font-body hover:bg-saffron/90 transition-colors"
        >
          Go Home
        </a>
      </div>
    </PageWrap>
  );
}

export default function VoxBharat() {
  const { showBuilder, setShowBuilder } = useBuilder();

  const handleLaunch = (config, questions) => {
    alert(`Survey "${config.name}" launched!\n${questions.length} questions\n${config.sampleSize} target responses`);
    setShowBuilder(false);
  };

  if (showBuilder) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <FullSurveyBuilder onClose={() => setShowBuilder(false)} onLaunch={handleLaunch} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<PageWrap><HowItWorksPage /></PageWrap>} />
        <Route path="/about" element={<PageWrap><AboutPage /></PageWrap>} />
        <Route path="/faqs" element={<PageWrap><FaqsPage /></PageWrap>} />
        <Route path="/memo" element={<PageWrap><MemoPage /></PageWrap>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<PageWrap><ResetPasswordPage /></PageWrap>} />
        <Route path="/api-docs" element={<PageWrap><ApiDocsPage /></PageWrap>} />
        <Route path="/data-policy" element={<PageWrap><DataPolicyPage /></PageWrap>} />

        {/* Dashboard — protected, with sidebar layout */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<OverviewPage />} />
          <Route path="surveys" element={<SurveysPage />} />
          <Route path="surveys/:name" element={<SurveyDetailPage />} />
          <Route path="calls" element={<CallLogsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="inbound" element={<InboundPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
