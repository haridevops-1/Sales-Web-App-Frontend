/**
 * Application Constants
 */

// Supported document formats: PDF and Word (.docx)
export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.docx'];
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// File size limit: 99 MB
export const MAX_FILE_SIZE_BYTES = 99 * 1024 * 1024;

// Supported Business Logo formats: PNG, JPG, JPEG, SVG, WebP
export const SUPPORTED_LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
export const SUPPORTED_LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp'
];

// Maximum Logo file size limit: 5 MB
export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

// Upload, Analysis, Experience Generation & Slate Deployment Stages
export const UPLOAD_STAGES = {
  READY: 'READY',
  UPLOADING: 'UPLOADING',
  EXTRACTING: 'EXTRACTING',
  EXTRACTED: 'EXTRACTED',
  AI_ANALYZING: 'AI_ANALYZING',
  AI_ANALYZED: 'AI_ANALYZED',
  GENERATING_EXPERIENCE: 'GENERATING_EXPERIENCE',
  GENERATED: 'GENERATED',
  DEPLOYING: 'DEPLOYING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
  // Backward compatibility alias
  WAITING_FOR_GENERATION: 'AI_ANALYZED'
};

// Backend Status & Pipeline Stage to User-Friendly Label Mappings
export const STATUS_MAPPING = {
  READY: 'Ready to upload',
  UPLOADING: 'Uploading document and business logo...',
  EXTRACTING: 'Extracting document text...',
  EXTRACTED: 'Document text extracted',
  AI_ANALYZING: 'Analyzing document requirements...',
  AI_ANALYZED: 'AI analysis completed',
  GENERATING_EXPERIENCE: 'Creating branded customer experience...',
  GENERATED: 'Branded customer experience generated',
  DEPLOYING: 'Publishing branded experience to Slate...',
  PUBLISHED: 'Branded customer experience published',
  FAILED: 'Processing failed',
  // Function 5 specific status labels
  READY_TO_PUBLISH: 'Ready to publish',
  DEPLOYMENT_IN_PROGRESS: 'Slate deployment is in progress',
  DEPLOYMENT_FAILED: 'Customer experience publication failed',
  // Backend status aliases
  UPLOADED: 'Document uploaded',
  PROCESSING: 'Analyzing document...',
  COMPLETED: 'AI analysis completed',
  RUNNING: 'Analyzing document...'
};

// Function 5 Slate Deployment Status Labels
export const FUNCTION_5_LABELS = {
  READY_TO_PUBLISH: 'Ready to publish',
  DEPLOYING: 'Publishing branded experience to Slate...',
  PUBLISHED: 'Branded customer experience published',
  IN_PROGRESS: 'Slate deployment is in progress',
  FAILED: 'Customer experience publication failed'
};

// Function 6 Process Status Pipeline Steps
export const PROCESS_PIPELINE_STEPS = [
  { id: 'UPLOADED', number: 1, label: 'Document Uploaded' },
  { id: 'EXTRACTING', number: 2, label: 'Document Extraction' },
  { id: 'PROCESSING', number: 3, label: 'Content Analysis' },
  { id: 'GENERATING', number: 4, label: 'Experience Generation' },
  { id: 'DEPLOYING', number: 5, label: 'Experience Deployment' },
  { id: 'PUBLISHED', number: 6, label: 'Published' }
];

// Function 6 Backend Stage to Label Mappings (Section 6)
export const PROCESS_STAGE_LABELS = {
  UPLOADED: 'Document Uploaded',
  EXTRACTING: 'Document Extraction',
  EXTRACTED: 'Document Extraction complete',
  PROCESSING: 'Content Analysis',
  GENERATING: 'Experience Generation',
  GENERATED: 'Experience Generation complete',
  DEPLOYING: 'Experience Deployment',
  PUBLISHED: 'Published',
  FAILED: 'Failed'
};


