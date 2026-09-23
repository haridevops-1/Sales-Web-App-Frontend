/**
 * Centralized API Call Guard & Circuit Breaker
 * 
 * Guarantees that:
 * 1. Every API is called at most once (or within its strict limit).
 * 2. If an API call fails once, it is permanently blocked from being called again
 *    (preventing repeated API calls and unwanted charges).
 * 3. Concurrent duplicate in-flight requests are blocked/deduplicated.
 * 4. Zero automatic retries are allowed anywhere in the application.
 */

// In-memory registry of failed calls
const failedKeys = new Set();

// In-memory call count per key
const callCounts = new Map();

// In-memory in-flight promises to prevent simultaneous duplicate requests
const inFlightPromises = new Map();

// Session storage prefix to persist failure locks across component remounts
const STORAGE_PREFIX = 'spikra_api_failed_';
const COUNT_PREFIX = 'spikra_api_count_';

/**
 * Generate a consistent unique key for an API call.
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} endpoint - The path or URL
 * @param {string|null} [paramIdentifier] - Optional unique identifier (e.g. documentId, projectId, packageId)
 * @returns {string} Unique operation key
 */
export function getApiKey(method = 'GET', endpoint = '', paramIdentifier = null) {
  const cleanMethod = String(method).toUpperCase();
  // Strip origin and query timestamps for consistent keying
  let cleanEndpoint = String(endpoint).trim();
  try {
    if (cleanEndpoint.startsWith('http')) {
      const urlObj = new URL(cleanEndpoint);
      cleanEndpoint = urlObj.pathname;
    } else {
      cleanEndpoint = cleanEndpoint.split('?')[0];
    }
  } catch {
    cleanEndpoint = cleanEndpoint.split('?')[0];
  }

  if (paramIdentifier) {
    return `${cleanMethod}:${cleanEndpoint}:${String(paramIdentifier).trim()}`;
  }
  return `${cleanMethod}:${cleanEndpoint}`;
}

/**
 * Check if an operation has previously failed.
 * @param {string} key - Operation key
 * @returns {boolean} True if failed
 */
export function hasApiFailed(key) {
  if (failedKeys.has(key)) return true;
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)) {
      failedKeys.add(key);
      return true;
    }
  } catch {
    // sessionStorage might be restricted in some environments
  }
  return false;
}

/**
 * Check how many times an operation has been called.
 * @param {string} key - Operation key
 * @returns {number} Current call count
 */
export function getApiCallCount(key) {
  let count = callCounts.get(key) || 0;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = parseInt(sessionStorage.getItem(`${COUNT_PREFIX}${key}`), 10);
      if (!isNaN(stored) && stored > count) {
        count = stored;
        callCounts.set(key, count);
      }
    }
  } catch {}
  return count;
}

/**
 * Register that an API call has failed.
 * Permanently locks this key so it cannot be retried.
 * @param {string} key - Operation key
 * @param {Error|any} error - The failure error
 */
export function markApiAsFailed(key, error) {
  failedKeys.add(key);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify({
        timestamp: Date.now(),
        message: error?.message || 'Failed'
      }));
    }
  } catch {}
  console.error(`[API Guard] Circuit broken: "${key}" failed and is permanently locked from repeating.`, error?.message);
}

/**
 * Register that an API call was initiated.
 * @param {string} key - Operation key
 */
export function incrementApiCallCount(key) {
  const current = getApiCallCount(key);
  const next = current + 1;
  callCounts.set(key, next);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`${COUNT_PREFIX}${key}`, String(next));
    }
  } catch {}
  return next;
}

/**
 * Validate whether an API call is permitted to execute.
 * Throws an Error if the API has previously failed or reached its call limit.
 * 
 * @param {string} key - Operation key
 * @param {number} [maxAllowed=1] - Maximum allowed executions (default 1)
 */
export function assertCanCallApi(key, maxAllowed = 1) {
  // 1. Check if this operation has previously failed
  if (hasApiFailed(key)) {
    const errorMsg = `[API Guard Blocked] Operation "${key}" previously failed. Subsequent calls are permanently blocked to prevent recurring charges.`;
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }

  // 2. Check if this operation has already reached its strict call limit
  const count = getApiCallCount(key);
  if (count >= maxAllowed) {
    const limitMsg = `[API Guard Limit] Operation "${key}" has reached its maximum call limit (${maxAllowed} call). Repeated executions are disallowed.`;
    console.warn(limitMsg);
    throw new Error(limitMsg);
  }
}

/**
 * High-level wrapper to safely execute an API call with strict single-call and failure guarantees.
 * 
 * @param {string} key - Unique key for this operation
 * @param {Function} callFn - Async function performing the single API request
 * @param {Object} [options]
 * @param {number} [options.maxCalls=1] - Hard limit on invocations (default 1)
 * @returns {Promise<any>} The result of callFn
 */
export async function executeGuardedApiCall(key, callFn, { maxCalls = 1 } = {}) {
  // Check failure and call limit before attempting
  assertCanCallApi(key, maxCalls);

  // Check if an identical request is currently in-flight
  if (inFlightPromises.has(key)) {
    console.warn(`[API Guard] Duplicate in-flight call detected for "${key}". Reusing existing pending request.`);
    return inFlightPromises.get(key);
  }

  // Increment call count immediately to guard against fast race conditions
  incrementApiCallCount(key);

  const promise = (async () => {
    try {
      const result = await callFn();
      return result;
    } catch (err) {
      // User-initiated cancellation is not a failure of the operation itself - permanently
      // locking the key here would block a perfectly legitimate retry later.
      if (err?.name === 'CancelledError' || err?.name === 'AbortError') {
        throw err;
      }
      // Record failure permanently: this key is never allowed to be called again!
      markApiAsFailed(key, err);
      throw err;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

/**
 * Reset all guard memory (useful only for fresh full application reload if needed).
 */
export function resetApiGuard() {
  failedKeys.clear();
  callCounts.clear();
  inFlightPromises.clear();
}
