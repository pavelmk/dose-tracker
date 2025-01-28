import React, { useState, useMemo, useEffect } from 'react';
import './App.css';
import DrugDefinitionForm from './components/DrugDefinitionForm';
import DoseForm from './components/DoseForm';
import DoseHistory from './components/DoseHistory';
import DecayGraph from './components/DecayGraph';
import TimeRangeSelector from './components/TimeRangeSelector';
import DataControls from './components/DataControls';
import { Drug, DoseEntry, PlottedDrug, TimeRange, AppState } from './types';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useTheme } from './hooks/useTheme';

function App() {
  // Initialize time range
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600000);
    return { start, end };
  });

  // Initialize undo/redo state with local storage
  const { state, updateState, undo, redo, canUndo, canRedo } = useUndoRedo({
    drugs: [],
    doseEntries: [],
    ...(() => {
      const savedState = localStorage.getItem('drugPlotterState');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // Convert string dates back to Date objects
          return {
            drugs: parsed.drugs || [],
            doseEntries: (parsed.doseEntries || []).map((dose: any) => ({
              ...dose,
              administrationTime: new Date(dose.administrationTime)
            }))
          };
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      }
      return {};
    })()
  });

  const { drugs, doseEntries } = state;
  const { theme, toggleTheme } = useTheme();
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);

  const handleDrugSelect = (drug: Drug) => {
    setSelectedDrug(drug);
  };

  // Calculate default time range based on doses
  const calculateDefaultTimeRange = (doses: DoseEntry[]): TimeRange => {
    if (doses.length === 0) {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 3600000);
      return { start, end };
    }

    const times = doses.map(dose => dose.administrationTime.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Set range to 1 day before first dose and 1 day after last dose
    const start = new Date(minTime - 24 * 3600000);
    const end = new Date(maxTime + 24 * 3600000);
    return { start, end };
  };

  // Initialize time range on first load only
  useEffect(() => {
    if (doseEntries.length > 0) {
      setTimeRange(calculateDefaultTimeRange(doseEntries));
    }
  }, []); // Empty dependency array means this only runs once on mount

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('drugPlotterState', JSON.stringify(state));
  }, [state]);

  const plottedDrugs = useMemo(() => {
    const drugMap = new Map<string, PlottedDrug>();
    
    drugs.forEach(drug => {
      drugMap.set(drug.id, { drug, doses: [] });
    });
    
    doseEntries.forEach(dose => {
      const plotted = drugMap.get(dose.drugId);
      if (plotted) {
        plotted.doses.push(dose);
      }
    });
    
    return Array.from(drugMap.values())
      .filter(plotted => plotted.doses.length > 0);
  }, [drugs, doseEntries]);

  const handleAddDrug = (drug: Drug) => {
    updateState({
      ...state,
      drugs: [...drugs, drug],
    });
  };

  const handleAddDose = (dose: DoseEntry) => {
    const newDoses = [...doseEntries, dose];
    updateState({
      ...state,
      doseEntries: newDoses,
    });

    // Only adjust time range if the new dose is outside current bounds
    const doseTime = dose.administrationTime.getTime();
    if (doseTime < timeRange.start.getTime() || doseTime > timeRange.end.getTime()) {
      const newStart = new Date(Math.min(doseTime - 24 * 3600000, timeRange.start.getTime()));
      const newEnd = new Date(Math.max(doseTime + 24 * 3600000, timeRange.end.getTime()));
      setTimeRange({ start: newStart, end: newEnd });
    }
  };

  const handleDeleteDose = (doseId: string) => {
    const newDoses = doseEntries.filter(dose => dose.id !== doseId);
    updateState({
      ...state,
      doseEntries: newDoses,
    });

    // Only adjust time range if the deleted dose was defining the bounds
    if (newDoses.length > 0) {
      const times = newDoses.map(dose => dose.administrationTime.getTime());
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const deletedTime = doseEntries.find(dose => dose.id === doseId)?.administrationTime.getTime();

      if (deletedTime && (deletedTime <= minTime + 24 * 3600000 || deletedTime >= maxTime - 24 * 3600000)) {
        setTimeRange({
          start: new Date(minTime - 24 * 3600000),
          end: new Date(maxTime + 24 * 3600000)
        });
      }
    }
  };

  const handleImport = (newState: AppState) => {
    updateState(newState);
  };

  return (
    <div className="App" data-theme={theme}>
      <header>
        <h1>Drug Dose Decay Plotter</h1>
        <div className="header-controls">
          <button onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button onClick={undo} disabled={!canUndo}>↩️ Undo</button>
          <button onClick={redo} disabled={!canRedo}>↪️ Redo</button>
          <DataControls state={state} onImport={handleImport} />
        </div>
      </header>
      <div className="container">
        <div className="forms-section">
          <div className="drug-definition">
            <DrugDefinitionForm onSubmit={handleAddDrug} />
            <div className="defined-drugs">
              <h3>Defined Drugs</h3>
              <ul>
                {drugs.map(drug => (
                  <li 
                    key={drug.id} 
                    style={{ 
                      color: drug.color,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedDrug(drug)}
                  >
                    {drug.name} (Half-life: {drug.halfLife}h)
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="dose-entry">
            <DoseForm 
              drugs={drugs} 
              onSubmit={handleAddDose} 
              doseEntries={doseEntries}
              selectedDrug={selectedDrug}
              onDrugSelect={setSelectedDrug}
            />
            <DoseHistory
              doses={doseEntries}
              drugs={drugs}
              onDelete={handleDeleteDose}
            />
          </div>
        </div>
        <div className="graph-section">
          <TimeRangeSelector 
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            doseEntries={doseEntries}
          />
          <DecayGraph 
            plottedDrugs={plottedDrugs}
            timeRange={timeRange}
            isDarkMode={theme === 'dark'}
            onDeleteDose={handleDeleteDose}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
