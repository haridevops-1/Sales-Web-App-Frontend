import React from 'react';
import WorkDrivePickerModal from '@/components/shared/WorkDrivePicker/WorkDrivePickerModal';

/**
 * Re-export wrapper for WorkDriveBrowser that delegates to the new shared WorkDrivePickerModal.
 */
export default function WorkDriveBrowser({ onClose, onContinue }) {
  return (
    <WorkDrivePickerModal
      isOpen={true}
      onClose={onClose}
      multiple={true}
      title="WorkDrive Discovery Documents"
      subtitle="Select discovery files from your Zoho WorkDrive"
      confirmLabel="Continue with Selected Files"
      onSelect={(items) => {
        if (onContinue) {
          onContinue(items.map((item) => ({
            workdrive_file_id: item.id,
            file_name: item.name,
            file_type: (item.extension || '').replace('.', ''),
            mime_type: item.mimeType,
            file_size: item.size
          })));
        }
      }}
    />
  );
}

export { WorkDrivePickerModal };
