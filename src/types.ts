// Drug definition type
export interface Drug {
  id: string;
  name: string;
  halfLife: number;  // in hours
  color: string;
}

// Dose entry type
export interface DoseEntry {
  id: string;
  drugId: string;
  initialDose: number;  // in mg
  administrationTime: Date;
}

// Data point for plotting
export interface DataPoint {
  x: Date;
  y: number;
}

// Combined type for plotting drug with its doses
export interface PlottedDrug {
  drug: Drug;
  doses: DoseEntry[];
}

// Application state for undo/redo
export interface AppState {
  drugs: Drug[];
  doseEntries: DoseEntry[];
}

// Theme types
export type Theme = 'light' | 'dark';

// Time range for graph
export interface TimeRange {
  start: Date;
  end: Date;
}
