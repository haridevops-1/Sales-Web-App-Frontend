import React from 'react';
import './UserProfile.css';
import { ChevronDown } from 'lucide-react';

export default function UserProfile({
  currentUser = {
    name: 'Hariharan R',
    designation: 'Product Consultant'
  },
  showDesignation = true,
  theme = 'dark',
  onClick
}) {
  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'HR';

  return (
    <div
      className={`spikra-user-profile ${theme} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={`${currentUser.name} • ${currentUser.designation || 'Consultant'} (Click for Settings)`}
    >
      <span className="user-avatar-ring">
        <span className="user-avatar-circle">
          <span className="user-avatar-initials">{userInitials}</span>
        </span>
        <span className="user-avatar-online-dot" aria-hidden="true" title="Online" />
      </span>
      <div className="user-info-text">
        <span className="user-name-text">{currentUser.name}</span>
        {showDesignation && currentUser.designation && (
          <span className="user-designation-badge">{currentUser.designation}</span>
        )}
      </div>
      {onClick && <ChevronDown size={14} strokeWidth={2.4} className="user-profile-chevron" />}
    </div>
  );
}
