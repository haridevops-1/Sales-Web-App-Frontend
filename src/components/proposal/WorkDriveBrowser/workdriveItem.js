/**
 * Normalizes a raw WorkDrive item into a consistent shape the browser UI can render.
 *
 * proposal-api's workdrive browse action passes through Zoho WorkDrive's own API v1
 * response items verbatim (marked "VERIFY" in the backend - not yet confirmed against a
 * real response). Zoho's documented v1 shape is JSON:API style
 * ({id, type, attributes: {...}}), but the exact attribute names for folder-vs-file and
 * size can vary by resource type, so this reads several plausible field paths rather
 * than assuming one - safer than guessing wrong and silently mis-rendering everything as
 * a file (or vice versa) once real data arrives.
 */
export function normalizeWorkdriveItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const attrs = raw.attributes && typeof raw.attributes === 'object' ? raw.attributes : raw;

  const id = raw.id || attrs.id || attrs.resource_id || '';
  const name = attrs.name || attrs.file_name || raw.name || 'Untitled';

  const rawType = String(attrs.type || raw.type || '').toLowerCase();
  const isFolder =
    attrs.is_folder === true ||
    rawType === 'folder' ||
    rawType === 'teamfolder' ||
    rawType === 'private_space' ||
    rawType === 'workspace';

  const sizeRaw = attrs.storage_info?.size ?? attrs.size ?? raw.size;
  const size = sizeRaw !== undefined && sizeRaw !== null ? Number(sizeRaw) || 0 : 0;

  const modifiedRaw = attrs.modified_time || attrs.modified_time_formatted || raw.modified_time || null;

  const extension = !isFolder ? String(name).slice(String(name).lastIndexOf('.')).toLowerCase() : '';

  return {
    id: String(id),
    name: String(name),
    isFolder,
    size,
    modifiedTime: modifiedRaw,
    extension,
    mimeType: attrs.mime_type || attrs.mimetype || '',
    raw
  };
}

export function normalizeWorkdriveItems(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(normalizeWorkdriveItem).filter(Boolean);
}
