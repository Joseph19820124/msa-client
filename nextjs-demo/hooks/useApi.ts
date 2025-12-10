import { useState, useEffect, useCallback } from 'react';

export interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useApiCall = <T>(
  apiCall: () => Promise<T>, 
  dependencies: any[] = []
): UseApiCallResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err: any) {
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

export interface UseApiSubmitResult {
  submit: (apiCall: () => Promise<any>, onSuccess?: () => void) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useApiSubmit = (): UseApiSubmitResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (apiCall: () => Promise<any>, onSuccess?: () => void) => {
    try {
      setLoading(true);
      setError(null);
      await apiCall();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('API submit failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error };
};