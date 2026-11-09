import React from 'react';
import './Feedback.css';

export default function SkeletonLoader() {
  return (
    <div className="skeleton-wrapper">
      <div className="stats-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <div className="skeleton skeleton-table" />
    </div>
  );
}
