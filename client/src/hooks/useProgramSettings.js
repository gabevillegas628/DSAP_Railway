// hooks/useProgramSettings.js
import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const useProgramSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/program-settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        } else {
          throw new Error('Failed to fetch program settings');
        }
      } catch (err) {
        console.error('Error fetching program settings:', err);
        setError(err.message);
        // Set default settings on error
        setSettings({ projectHeader: 'DNA Analysis Program' });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
};

export default useProgramSettings;