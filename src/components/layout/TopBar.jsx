import React from 'react';
import { useLocation } from 'react-router-dom';
import { useBuilder } from '../../contexts/BuilderContext';

const titles = {
  '/dashboard': 'Overview',
  '/dashboard/surveys': 'Surveys',
  '/dashboard/calls': 'Call Logs',
  '/dashboard/campaigns': 'Campaigns',
  '/dashboard/insights': 'Insights',
  '/dashboard/settings': 'Settings',
};

export default function TopBar() {
  const location = useLocation();
  const { setShowBuilder } = useBuilder();

  // Match exact or prefix for detail pages
  const title = titles[location.pathname] ||
    (location.pathname.startsWith('/dashboard/surveys/') ? 'Survey Detail' :
     location.pathname.startsWith('/dashboard/campaigns/') ? 'Campaign Detail' :
     'Dashboard');

  return (
    <header className="bg-cream border-b border-earth/10 px-8 py-4 flex items-center justify-between shrink-0">
      <h1 className="font-heading text-xl font-semibold text-earth">{title}</h1>
      <button
        onClick={() => setShowBuilder(true)}
        className="px-5 py-2 bg-saffron text-white rounded-full font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
      >
        New Survey
      </button>
    </header>
  );
}
