import React from 'react';
import { AppState } from '../types';

interface DataControlsProps {
  state: AppState;
  onImport: (data: AppState) => void;
}

const DataControls: React.FC<DataControlsProps> = ({ state, onImport }) => {
  const handleExport = () => {
    const dataStr = JSON.stringify(state, (key, value) => {
      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drug-plotter-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string, (key, value) => {
          // Convert ISO strings back to Date objects for administrationTime
          if (key === 'administrationTime' && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
        onImport(data);
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="data-controls">
      <button onClick={handleExport}>Export Data</button>
      <label className="import-button">
        Import Data
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
};

export default DataControls;
