/**
 * Centralized API Call Guard & Execution Controller
 * 
 * Guarantees:
 * 1. When an API call fails, it fails immediately and stops. Zero automatic retries
 *    or recurring failure loops.
 * 2. Proper API call times:
 *    - Operations with explicit call limits (e.g. AI triggers, single uploads) are enforced.
 *    - Read-only queries, catalog listings, and status polling are permitted their required
 *      call times without being artificially restricted.
 * 3. Concurrent duplicate in-flight requests for the same key are deduplicated.
 */

// In-memory registry of failed operation keys
const failedKeys = new Set();

// In-memory call count per operation key
const callCounts = new Map();

// In-memory in-flight promises to deduplicate concurrent requests
const inFlightPromises = new Map();

// Storage prefixes for session-scoped tracking
const STORAGE_PREFIX = "spikra_api_failed_";
const COUNT_PREFIX = "spikra_api_count_";

// Cleanup any old emergency-halt or corrupted state from previous sessions
try {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("spikra_app_permanently_halted");
    sessionStorage.removeItem("spikra_api_halt");
    sessionStorage.removeItem("spikra_guard_halt");
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith("spikra_app_") || key.startsWith("spikra_guard_"))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  }
} catch {}

/**
 * Generate a consistent, unique key for an API call.
 * Differentiates endpoints, query strings, and unique identifiers.
 * 
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} endpoint - The path or URL
 * @param {string|null} [paramIdentifier] - Optional unique identifier
 * @returns {string} Unique operation key
 */
export function getApiKey(method = "GET", endpoint = "", paramIdentifier = null) {
  const cleanMethod = String(method).toUpperCase();
  let cleanEndpoint = String(endpoint).trim();
  let queryPart = "";

  try {
    if (cleanEndpoint.startsWith("http")) {
      const urlObj = new URL(cleanEndpoint);
      cleanEndpoint = urlObj.pathname;
      queryPart = urlObj.search || "";
    } else if (cleanEndpoint.includes("?")) {
      const [path, query] = cleanEndpoint.split("?");
      cleanEndpoint = path;
      queryPart = query ? "?" + query : "";
    }
  } catch {
    cleanEndpoint = cleanEndpoint.split("?")[0];
  }

  const baseKey = queryPart ? `${cleanMethod}:${cleanEndpoint}${queryPart}` : `${cleanMethod}:${cleanEndpoint}`;
  if (paramIdentifier) {
    return `${baseKey}:${String(paramIdentifier).trim()}`;
  }
  return baseKey;
}

/**
 * Check if an operation has previously failed.
 * @param {string} key - Operation key
 * @returns {boolean} True if failed
 */
export function hasApiFailed(key) {
  if (failedKeys.has(key)) return true;
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_PREFIX + key)) {
      failedKeys.add(key);
      return true;
    }
  } catch {}
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
    if (typeof sessionStorage !== "undefined") {
      const stored = parseInt(sessionStorage.getItem(COUNT_PREFIX + key), 10);
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
 * Stops repeat executions of this failed operation.
 * @param {string} key - Operation key
 * @param {Error|any} error - The failure error
 */
export function markApiAsFailed(key, error) {
  failedKeys.add(key);
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        STORAGE_PREFIX + key,
        JSON.stringify({
          timestamp: Date.now(),
          message: error?.message || "Failed"
        })
      );
    }
  } catch {}

  console.error("[API Guard] Operation \"" + key + "\" failed and execution is stopped at this point.", error?.message);
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
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(COUNT_PREFIX + key, String(next));
    }
  } catch {}
  return next;
}

/**
 * Validate whether an API call is permitted to execute.
 * Throws an Error if the API has previously failed or reached its configured call limit.
 * 
 * @param {string} key - Operation key
 * @param {number} [maxAllowed=Infinity] - Maximum allowed executions
 */
export function assertCanCallApi(key, maxAllowed = Infinity) {
  // 1. If this exact operation previously failed, stop it right at that point
  if (hasApiFailed(key)) {
    const errorMsg = "[API Guard Blocked] Operation \"" + key + "\" previously failed. Subsequent calls are stopped.";
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }

  // 2. Check call count limit when a finite limit is specified
  if (typeof maxAllowed === "number" && Number.isFinite(maxAllowed)) {
    const count = getApiCallCount(key);
    if (count >= maxAllowed) {
      const limitMsg = "[API Guard Limit] Operation \"" + key + "\" has reached its maximum call limit (" + maxAllowed + " call" + (maxAllowed > 1 ? "s" : "") + "). Repeated executions are disallowed.";
      console.warn(limitMsg);
      throw new Error(limitMsg);
    }
  }
}

/**
 * High-level wrapper to safely execute an API call with proper limits, failure halts,
 * and concurrent in-flight deduplication.
 * 
 * @param {string} key - Unique key for this operation
 * @param {Function} callFn - Async function performing the API request
 * @param {Object} [options]
 * @param {number} [options.maxCalls=Infinity] - Hard limit on invocations (default Infinity for uncapped/read calls)
 * @returns {Promise<any>} The result of callFn
 */
export async function executeGuardedApiCall(key, callFn, { maxCalls = Infinity } = {}) {
  // Check failure and call limit before attempting any call
  assertCanCallApi(key, maxCalls);

  // Check if an identical request is currently in-flight
  if (inFlightPromises.has(key)) {
    console.warn("[API Guard] Duplicate in-flight call detected for \"" + key + "\". Reusing existing pending request.");
    return inFlightPromises.get(key);
  }

  // Increment call count immediately to guard against fast race conditions
  incrementApiCallCount(key);

  const promise = (async () => {
    try {
      const result = await callFn();
      return result;
    } catch (err) {
      // User-initiated explicit cancellation or abort is not a permanent backend failure
      if (err?.name === "CancelledError" || err?.name === "AbortError") {
        throw err;
      }
      // When the API fails for anything, stop at that point and record failure
      markApiAsFailed(key, err);
      throw err;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

/** Backward compatibility stubs for legacy imports */
export function isAppHalted() {
  return false;
}

export function getAppHaltReason() {
  return null;
}

export function tripGlobalCircuitBreaker() {
  // No-op: individual operations halt on failure without locking the entire app
}

/**
 * Reset guard memory (clears locks, counts, and in-flight promises).
 */
export function resetApiGuard() {
  failedKeys.clear();
  callCounts.clear();
  inFlightPromises.clear();
  try {
    if (typeof sessionStorage !== "undefined") {
      const toRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith(STORAGE_PREFIX) || k.startsWith(COUNT_PREFIX) || k.startsWith("spikra_"))) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch {}
}
