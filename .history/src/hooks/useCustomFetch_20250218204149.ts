import { useCallback, useContext } from "react"
import { AppContext } from "../utils/context"
import { fakeFetch, RegisteredEndpoints } from "../utils/fetch"
import { useWrappedRequest } from "./useWrappedRequest"

export function useCustomFetch() {
  const { cache } = useContext(AppContext)
  const { loading, wrappedRequest } = useWrappedRequest()

  const fetchWithCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const cacheKey = getCacheKey(endpoint, params)
        const cacheResponse = cache?.current.get(cacheKey)

        if (cacheResponse) {
          const data = JSON.parse(cacheResponse)
          return data as Promise<TData>
        }

        const result = await fakeFetch<TData>(endpoint, params)
        cache?.current.set(cacheKey, JSON.stringify(result))
        return result
      }),
    [cache, wrappedRequest]
  )

  const fetchWithoutCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const result = await fakeFetch<TData>(endpoint, params)
        return result
      }),
    [wrappedRequest]
  )

  const clearCache = useCallback(() => {
    if (cache?.current === undefined) {
      return
    }

    cache.current = new Map<string, string>()
  }, [cache])

  const clearCacheByEndpoint = useCallback(
    (endpointsToClear: RegisteredEndpoints[]) => {
      if (cache?.current === undefined) {
        return
      }

      const cacheKeys = Array.from(cache.current.keys())

      for (const key of cacheKeys) {
        const clearKey = endpointsToClear.some((endpoint) => key.startsWith(endpoint))

        if (clearKey) {
          cache.current.delete(key)
        }
      }
    },
    [cache]
  )

  const updateTransactionInCache = useCallback(
    (transactionId: string, newValue: boolean) => {
      if (!cache?.current) return;

      // Convert Map entries to array for iteration
      const cacheEntries = Array.from(cache.current);

      // Update transaction status in all cached data
      for (const [key, value] of cacheEntries) {
        if (key.includes('paginatedTransactions') || key.includes('transactionsByEmployee')) {
          const data = JSON.parse(value);

          // Handle paginated response structure
          if (data.data) {
            const updatedData = {
              ...data,
              data: data.data.map((t: any) =>
                t.id === transactionId ? { ...t, approved: newValue } : t
              ),
            };
            cache.current.set(key, JSON.stringify(updatedData));
          }
          // Handle direct transaction array
          else if (Array.isArray(data)) {
            const updatedData = data.map((t: any) =>
              t.id === transactionId ? { ...t, approved: newValue } : t
            );
            cache.current.set(key, JSON.stringify(updatedData));
          }
        }
      }

      // Clear other cached endpoints to force fresh data on next load
      clearCacheByEndpoint(['transactionsByEmployee']);
    },
    [cache, clearCacheByEndpoint]
  )

  return { fetchWithCache, fetchWithoutCache, clearCache, clearCacheByEndpoint, loading, updateTransactionInCache }
}

function getCacheKey(endpoint: RegisteredEndpoints, params?: object) {
  return `${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
}
