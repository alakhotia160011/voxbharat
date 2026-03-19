import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CampaignList from '../../components/campaigns/CampaignList';
import CampaignDetail from '../../components/campaigns/CampaignDetail';
import NewCampaignFlow from '../../components/campaigns/NewCampaignFlow';
import { api } from '../../lib/api';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchCampaigns = useCallback(() => {
    setLoading(true);
    api.getCampaigns()
      .then(d => setCampaigns(d))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Poll running campaigns
  useEffect(() => {
    const hasRunning = campaigns.some(c => c.status === 'running' || c.status === 'in_progress');
    if (!hasRunning) return;
    const timer = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(timer);
  }, [campaigns, fetchCampaigns]);

  if (showNew) {
    return (
      <div className="max-w-4xl mx-auto">
        <NewCampaignFlow
          onBack={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            setSelectedId(id);
            fetchCampaigns();
          }}
        />
      </div>
    );
  }

  if (selectedId) {
    return (
      <div className="max-w-6xl mx-auto">
        <CampaignDetail
          campaignId={selectedId}
          onBack={() => { setSelectedId(null); fetchCampaigns(); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <CampaignList
        campaigns={campaigns}
        loading={loading}
        onSelect={setSelectedId}
        onNewCampaign={() => setShowNew(true)}
        onRefresh={fetchCampaigns}
      />
    </div>
  );
}
