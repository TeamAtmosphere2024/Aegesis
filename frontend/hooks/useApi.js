import { useState, useCallback } from 'react';

/**
 * Reusable React Hook for handling API calls with loading and error states.
 * 
 * Usage:
 * const { data, loading, error, execute } = useApi(fetchRiderProfile);
 * 
 * useEffect(() => { execute(riderId); }, []);
 */
export function useApi(apiFunc) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      console.error("[useApi Hook]:", err);
      // Re-throw if the component needs to handle it
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return {
    data,
    loading,
    error,
    execute,
    setData,
  };
}

export default useApi;
