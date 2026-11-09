import React from 'react';
import './StatCard.css';

export default function StatCard({ title, value, subtitle, icon, colorClass }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <span className={`stat-icon-bg ${colorClass}`}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
