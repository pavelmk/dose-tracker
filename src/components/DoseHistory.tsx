import React from 'react';
import { Drug, DoseEntry } from '../types';

interface DoseHistoryProps {
  doses: DoseEntry[];
  drugs: Drug[];
  onDelete: (doseId: string) => void;
}

const DoseHistory: React.FC<DoseHistoryProps> = ({ doses, drugs, onDelete }) => {
  // Sort doses by time, most recent first
  const sortedDoses = [...doses].sort((a, b) => 
    b.administrationTime.getTime() - a.administrationTime.getTime()
  );

  const getDrugName = (drugId: string): string => {
    const drug = drugs.find(d => d.id === drugId);
    return drug ? drug.name : 'Unknown Drug';
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="dose-history-container">
      <h3>Dose History</h3>
      <div className="dose-history-list">
        {sortedDoses.map(dose => (
          <div key={dose.id} className="dose-history-item">
            <div className="dose-history-content">
              <div className="dose-history-drug">{getDrugName(dose.drugId)}</div>
              <div className="dose-history-details">
                <span className="dose-history-amount">{dose.initialDose}mg</span>
                <span className="dose-history-time">{formatDateTime(dose.administrationTime)}</span>
              </div>
            </div>
            <button 
              className="dose-history-delete"
              onClick={() => onDelete(dose.id)}
              aria-label="Delete dose"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoseHistory;
