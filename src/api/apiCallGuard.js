/**
 * Centralized API Call Guard & Global Circuit Breaker
 * 
 * Strict Guarantees:
 * 1. ZERO automatic retries or fallback API calls anywhere in the application.
 * 2. Every API is called at most ONCE.
 * 3. GLOBAL APPLICATION EMERGENCY STOP:
 *    If ANY single API call fails, the entire application halts all further API
 *    traffic immediately and permanently. No secondary requests, no fallback
 *    URLs, no polling loops, and no repeat calls can reach the network.
 * 4. Concurrent duplicate in-flight requests are blocked/deduplicated.
 */

// Global emergency stop flag
let isGlobalApplicationHalted = false;
let globalHaltReason = null;
const GLOBAL_HALT_KEY = "spikra_app_permanently_halted";

// In-memory registry of failed calls
const failedKeys = new Set();

// In-memory registry of failed entities/identifiers (e.g. documentId, projectId, packageId)
const failedIdentifiers = new Set();

// In-memory call count per key
const callCounts = new Map();

// In-memory in-flight promises to prevent simultaneous duplicate requests
const inFlightPromises = new Map();

// Session storage prefix to persist failure locks across component remounts
const STORAGE_PREFIX = "spikra_api_failed_";
const COUNT_PREFIX = "spikra_api_count_";
const FAILED_ID_PREFIX = "spikra_failed_id_";

/**
 * Check if the entire application has been halted due to any API failure.
 * @returns {boolean} True if application is halted
 */
export function isAppHalted() {
  if (isGlobalApplicationHalted) return true;
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem(GLOBAL_HALT_KEY);
      if (stored) {
        isGlobalApplicationHalted = true;
        globalHaltReason = stored;
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Get the reason for the global application halt.
 * @returns {string|null}
 */
export function getAppHaltReason() {
  if (!globalHaltReason) {
    try {
      if (typeof sessionStorage !== "undefined") {
        globalHaltReason = sessionStorage.getItem(GLOBAL_HALT_KEY);
      }
    } catch {}
  }
  return globalHaltReason;
}

/**
 * Trip the Global Circuit Breaker immediately halting the entire application.
 * @param {Error|any} error - The error that caused the halt
 * @param {string} [triggerKey=""] - Operation key that failed
 */
export function tripGlobalCircuitBreaker(error, triggerKey = "") {
  isGlobalApplicationHalted = true;
  globalHaltReason = error?.message || "An API operation failed";
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(GLOBAL_HALT_KEY, `${triggerKey ? "[" + triggerKey + "] " : ""}${globalHaltReason}`);
    }
  } catch {}
  console.error(
    `[API Guard EMERGENCY STOP] Application-wide halt triggered by "${triggerKey}". ZERO subsequent API calls will be made.`,
    error
  );
}

/**
 * Generate a consistent unique key for an API call.
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} endpoint - The path or URL
 * @param {string|null} [paramIdentifier] - Optional unique identifier (e.g. documentId, projectId, packageId)
 * @returns {string} Unique operation key
 */
export function getApiKey(method = "GET", endpoint = "", paramIdentifier = null) {
  const cleanMethod = String(method).toUpperCase();
  let cleanEndpoint = String(endpoint).trim();
  try {
    if (cleanEndpoint.startsWith("http")) {
      const urlObj = new URL(cleanEndpoint);
      cleanEndpoint = urlObj.pathname;
    } else {
      cleanEndpoint = cleanEndpoint.split("?")[0];
    }
  } catch {
    cleanEndpoint = cleanEndpoint.split("?")[0];
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
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)) {
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
 * Permanently locks this key and any associated identifier so nothing can be retried.
 * @param {string} key - Operation key
 * @param {Error|any} error - The failure error
 */
export function markApiAsFailed(key, error) {
  failedKeys.add(key);
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify({
        timestamp: Date.now(),
        message: error?.message || "Failed"
      }));
    }
  } catch {}

  const parts = String(key).split(":");
  if (parts.length > 2) {
    const identifier = parts.slice(2).join(":").trim();
    if (identifier) {
      failedIdentifiers.add(identifier);
      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(`${FAILED_ID_PREFIX}${identifier}`, "1");
        }
      } catch {}
    }
  }

  console.error(`[API Guard] Circuit broken: "${key}" failed and is permanently locked.`, error?.message);
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
      sessionStorage.setItem(`${COUNT_PREFIX}${key}`, String(next));
    }
  } catch {}
  return next;
}

/**
 * Validate whether an API call is permitted to execute.
 * Throws an Error if the global application is halted, if the API has failed, or reached its call limit.
 * 
 * @param {string} key - Operation key
 * @param {number} [maxAllowed=1] - Maximum allowed executions (strictly 1 by default)
 */
export function assertCanCallApi(key, maxAllowed = 1) {
  // 0. GLOBAL APPLICATION HALT: If ANY API has failed, stop the whole application instantly!
  if (isAppHalted()) {
    const haltMsg = `[Application Halted] All API activity has been permanently stopped due to an earlier failure: ${getAppHaltReason() || "API failed"}. No further network requests will be executed.`;
    console.error(haltMsg);
    throw new Error(haltMsg);
  }

  // 1. Check if this exact operation has previously failed
  if (hasApiFailed(key)) {
    const errorMsg = `[API Guard Blocked] Operation "${key}" previously failed. Subsequent calls are permanently blocked.`;
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }

  // 2. Check if the entity identifier within this key has previously encountered a failure
  const parts = String(key).split(":");
  if (parts.length > 2) {
    const identifier = parts.slice(2).join(":").trim();
    if (identifier && (failedIdentifiers.has(identifier) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem(`${FAILED_ID_PREFIX}${identifier}`)))) {
      const errorMsg = `[API Guard Blocked] Entity "${identifier}" encountered a previous failure. All operations for this entity are stopped.`;
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // Strict cap: Every API call is capped at strictly 1 call max
  const effectiveMax = Math.min(maxAllowed, 1);

  // 3. Check if this operation has already reached its strict call limit
  const count = getApiCallCount(key);
  if (count >= effectiveMax) {
    const limitMsg = `[API Guard Limit] Operation "${key}" has reached its maximum call limit (${effectiveMax} call). Repeated executions are disallowed.`;
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
  // Check global halt, failure, and call limit before attempting any call
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
      if (err?.name === "CancelledError") {
        throw err;
      }
      // CRITICAL: Trip global circuit breaker and mark this API as failed immediately
      tripGlobalCircuitBreaker(err, key);
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
  isGlobalApplicationHalted = false;
  globalHaltReason = null;
  failedKeys.clear();
  failedIdentifiers.clear();
  callCounts.clear();
  inFlightPromises.clear();
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(GLOBAL_HALT_KEY);
    }
  } catch {}
}
