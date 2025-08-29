import { Drug, DoseEntry } from '../types';

/**
 * Calculate the remaining concentration of a single dose at a specific time
 * @param initialDose - The initial dose amount in mg
 * @param halfLifeHours - Drug half-life in hours
 * @param timeElapsedMs - Time elapsed since administration in milliseconds
 * @returns Remaining concentration in mg
 */
export const calculateSingleDoseConcentration = (
  initialDose: number,
  halfLifeHours: number,
  timeElapsedMs: number
): number => {
  if (timeElapsedMs < 0) return 0;
  
  const halfLifeMs = halfLifeHours * 60 * 60 * 1000;
  const halfLives = timeElapsedMs / halfLifeMs;
  return initialDose * Math.pow(0.5, halfLives);
};

/**
 * Calculate the total concentration from multiple doses at a specific time
 * @param doses - Array of dose entries
 * @param drug - Drug information including half-life
 * @param timeMs - Time point to calculate concentration (in milliseconds since epoch)
 * @returns Total concentration in mg
 */
export const calculateTotalConcentration = (
  doses: DoseEntry[],
  drug: Drug,
  timeMs: number
): number => {
  let totalConcentration = 0;
  
  for (const dose of doses) {
    const timeElapsed = timeMs - dose.administrationTime.getTime();
    if (timeElapsed >= 0) {
      totalConcentration += calculateSingleDoseConcentration(
        dose.initialDose,
        drug.halfLife,
        timeElapsed
      );
    }
  }
  
  return totalConcentration;
};

/**
 * Calculate concentration at a specific time point for a drug with given doses
 * @param doses - Array of dose entries for the drug
 * @param drug - Drug information
 * @param targetTime - Target time as Date object
 * @returns Concentration in mg
 */
export const calculateConcentrationAtTime = (
  doses: DoseEntry[],
  drug: Drug,
  targetTime: Date
): number => {
  return calculateTotalConcentration(doses, drug, targetTime.getTime());
}; 