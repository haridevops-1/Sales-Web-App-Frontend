import {
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_LOGO_EXTENSIONS,
  SUPPORTED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES
} from './constants';


/**
 * Format bytes to human readable string (e.g. 4.8 MB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format full date and time string (e.g. "Sep 02, 2026 • 02:45 PM")
 */
export function formatDateTime(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${dateStr} • ${timeStr}`;
}

/**
 * Format short date (e.g. "Sep 02, 2026")
 */
export function formatDate(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Infer human-friendly business or project name from uploaded filename
 */
export function inferBusinessName(filename) {
  if (!filename) return '';
  let baseName = filename.replace(/\.[^/.]+$/, '');
  // Strip Windows 8.3 filename short-name mangling (e.g. BOOTCA~1 -> BOOTCA)
  baseName = baseName.replace(/~\d+/g, '');
  baseName = baseName.replace(/[-_]+/g, ' ');
  baseName = baseName.replace(
    /\b(discovery|technical|requirements|proposal|notes|spec|specifications|draft|v\d+|final|doc|pdf)\b/gi,
    ''
  );
  baseName = baseName.trim().replace(/\s+/g, ' ');
  if (!baseName) return '';

  return baseName
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate selected technical discovery file
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a document to upload.' };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please upload a valid document.'
    };
  }

  const extension = '.' + file.name.split('.').pop().toLowerCase();
  const isExtensionValid = SUPPORTED_FILE_EXTENSIONS.includes(extension);

  if (!isExtensionValid) {
    return {
      valid: false,
      error: `Unsupported file format (${extension}). Please upload a PDF (.pdf) or Word (.docx) document.`
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 99 MB limit (${formatBytes(file.size)}).`
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate selected business logo file
 * Accepted formats: PNG, JPG, JPEG, and WebP (SVG excluded on frontend)
 * Maximum size: 5 MB
 */
export function validateLogoFile(file) {
  if (!file) {
    return { valid: false, error: 'Please upload a valid business logo.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected logo file is empty (0 bytes).' };
  }

  const extension = '.' + file.name.split('.').pop().toLowerCase();
  const isExtensionValid = SUPPORTED_LOGO_EXTENSIONS.includes(extension);

  // If MIME type is present, verify against allowed MIME types
  const mimeType = (file.type || '').toLowerCase();
  const isMimeValid = !mimeType || SUPPORTED_LOGO_MIME_TYPES.includes(mimeType);

  if (!isExtensionValid || !isMimeValid) {
    return {
      valid: false,
      error: 'Only PNG, JPG, JPEG, SVG, and WebP files are supported.'
    };
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Logo size must be 5 MB or smaller.'
    };
  }

  return { valid: true, error: null };
}


/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback', err);
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textArea);
  return successful;
}
