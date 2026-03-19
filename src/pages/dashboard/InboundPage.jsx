import React, { useState, useEffect, useCallback } from 'react';
import InboundList from '../../components/inbound/InboundList';
import InboundDetail from '../../components/inbound/InboundDetail';
import InboundConfigForm from '../../components/inbound/InboundConfigForm';
import { api } from '../../lib/api';

export default function InboundPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const fetchConfigs = useCallback(() => {
    setLoading(true);
    api.getInboundConfigs()
      .then(d => setConfigs(d))
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  if (showNew) {
    return (
      <InboundConfigForm
        onBack={() => setShowNew(false)}
        onCreated={() => { setShowNew(false); fetchConfigs(); }}
      />
    );
  }

  if (selectedId) {
    return (
      <InboundDetail
        configId={selectedId}
        onBack={() => { setSelectedId(null); fetchConfigs(); }}
      />
    );
  }

  return (
    <InboundList
      configs={configs}
      loading={loading}
      onSelect={(id) => setSelectedId(id)}
      onNewConfig={() => setShowNew(true)}
      onRefresh={fetchConfigs}
    />
  );
}
