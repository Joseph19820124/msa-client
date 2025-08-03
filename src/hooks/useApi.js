import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useApiConfig = () => {
  const postsUrl = process.env.REACT_APP_POSTS_SERVICE_URL || "http://localhost:4000";
  const commentsUrl = process.env.REACT_APP_COMMENTS_SERVICE_URL || "http://localhost:4001";
  
  return { postsUrl, commentsUrl };
};

export const useApiCall = (apiCall, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('API call failed:', err);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch };
};

export const useApiSubmit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (apiCall, onSuccess) => {
    try {
      setLoading(true);
      setError(null);
      await apiCall();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('API submit failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error };
};