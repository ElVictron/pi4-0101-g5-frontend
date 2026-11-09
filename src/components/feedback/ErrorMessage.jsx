import React from 'react';
import './Feedback.css';

export default function ErrorMessage({ message }) {
  return (
    <div role="alert" className="error-banner">
      <span>⚠️</span>
      <div>
        <strong>Aviso de Conexão:</strong> {message || 'Não foi possível se comunicar com o backend.'}
      </div>
    </div>
  );
}
