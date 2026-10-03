/**
 * Normalizes a raw Zoho WorkDrive item into a consistent shape for the UI.
 * Handles both Zoho API v1 JSON:API structure and flattened Catalyst response structures.
 */

export function normalizeWorkdriveItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const attrs = raw.attributes && typeof raw.attributes === 'object' ? raw.attributes : raw;

  const id = raw.id || attrs.id || attrs.resource_id || attrs.file_id || '';
  const name = attrs.name || attrs.file_name || raw.name || attrs.display_name || 'Untitled';

  const rawType = String(attrs.type || raw.type || '').toLowerCase();
  const isFolder =
    attrs.is_folder === true ||
    raw.is_folder === true ||
    rawType === 'folder' ||
    rawType === 'folders' ||
    rawType === 'teamfolder' ||
    rawType === 'private_space' ||
    rawType === 'workspace' ||
    rawType === 'workspaces';

  const sizeRaw = attrs.storage_info?.size ?? attrs.size ?? raw.size ?? attrs.file_size;
  const size = sizeRaw !== undefined && sizeRaw !== null ? Number(sizeRaw) || 0 : 0;

  const modifiedRaw = attrs.modified_time || attrs.modified_time_formatted || raw.modified_time || attrs.updated_time || null;

  const lastDot = String(name).lastIndexOf('.');
  const extension = !isFolder && lastDot !== -1 ? String(name).slice(lastDot).toLowerCase() : '';

  return {
    id: String(id),
    name: String(name),
    isFolder,
    size,
    modifiedTime: modifiedRaw,
    extension,
    mimeType: attrs.mime_type || attrs.mimetype || raw.mime_type || '',
    raw
  };
}

export function normalizeWorkdriveItems(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(normalizeWorkdriveItem).filter(Boolean);
}
