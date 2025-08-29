import { 
  calculateSingleDoseConcentration, 
  calculateTotalConcentration, 
  calculateConcentrationAtTime 
} from './doseCalculations';
import { Drug, DoseEntry } from '../types';

describe('Dose Calculations', () => {
  describe('calculateSingleDoseConcentration', () => {
    it('should return 0 for negative time elapsed', () => {
      const result = calculateSingleDoseConcentration(100, 24, -1000);
      expect(result).toBe(0);
    });

    it('should return initial dose at time 0', () => {
      const result = calculateSingleDoseConcentration(100, 24, 0);
      expect(result).toBe(100);
    });

    it('should return half the dose after one half-life', () => {
      const initialDose = 100;
      const halfLife = 24; // hours
      const oneHalfLifeMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      const result = calculateSingleDoseConcentration(initialDose, halfLife, oneHalfLifeMs);
      expect(result).toBeCloseTo(50, 10); // Should be exactly 50
    });

    it('should return quarter the dose after two half-lives', () => {
      const initialDose = 100;
      const halfLife = 24; // hours
      const twoHalfLivesMs = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
      
      const result = calculateSingleDoseConcentration(initialDose, halfLife, twoHalfLivesMs);
      expect(result).toBeCloseTo(25, 10); // Should be exactly 25
    });
  });

  describe('Test Case 1: 24hr half-life drug decay over 40 days', () => {
    const drug: Drug = {
      id: 'test-drug',
      name: 'Test Drug',
      halfLife: 24, // 24 hour half-life
      color: '#ff0000'
    };

    const baseTime = new Date('2024-01-01T12:00:00Z');
    const initialDose = 100; // mg

    const dose: DoseEntry = {
      id: 'dose-1',
      drugId: drug.id,
      initialDose: initialDose,
      administrationTime: baseTime
    };

    it('should halve the concentration every 24 hours for 40 days', () => {
      let expectedConcentration = initialDose;
      
      // Test every 24 hours for 40 days (40 data points)
      for (let day = 0; day <= 40; day++) {
        const testTime = new Date(baseTime.getTime() + day * 24 * 60 * 60 * 1000);
        const actualConcentration = calculateConcentrationAtTime([dose], drug, testTime);
        
        // Allow for very small floating point errors
        expect(actualConcentration).toBeCloseTo(expectedConcentration, 10);
        
        // Update expected concentration for next iteration (half every 24 hours)
        expectedConcentration = expectedConcentration / 2;
      }
    });

    it('should handle multiple doses correctly', () => {
      // Add a second dose 12 hours after the first
      const secondDose: DoseEntry = {
        id: 'dose-2',
        drugId: drug.id,
        initialDose: initialDose,
        administrationTime: new Date(baseTime.getTime() + 12 * 60 * 60 * 1000)
      };

      const doses = [dose, secondDose];

      // Test at 24 hours after first dose (12 hours after second dose)
      const testTime = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
      const actualConcentration = calculateConcentrationAtTime(doses, drug, testTime);
      
      // First dose: 100mg after 24 hours = 50mg
      // Second dose: 100mg after 12 hours = ~70.71mg (100 * 0.5^0.5)
      const expectedFromFirstDose = 50;
      const expectedFromSecondDose = 100 * Math.pow(0.5, 0.5); // 0.5 half-lives
      const expectedTotal = expectedFromFirstDose + expectedFromSecondDose;
      
      expect(actualConcentration).toBeCloseTo(expectedTotal, 10);
    });

    it('should be approximately zero after many half-lives', () => {
      // Test after 10 half-lives (240 hours = 10 days)
      const testTime = new Date(baseTime.getTime() + 10 * 24 * 60 * 60 * 1000);
      const actualConcentration = calculateConcentrationAtTime([dose], drug, testTime);
      
      // After 10 half-lives: 100 * (0.5)^10 = 100 * (1/1024) ≈ 0.0977
      const expected = 100 * Math.pow(0.5, 10);
      expect(actualConcentration).toBeCloseTo(expected, 10);
      expect(actualConcentration).toBeLessThan(0.1); // Should be very small
    });

    it('should calculate exact values at specific intervals', () => {
      const testCases = [
        { hours: 0, expectedRatio: 1 },        // 100%
        { hours: 24, expectedRatio: 0.5 },     // 50%  
        { hours: 48, expectedRatio: 0.25 },    // 25%
        { hours: 72, expectedRatio: 0.125 },   // 12.5%
        { hours: 96, expectedRatio: 0.0625 },  // 6.25%
        { hours: 120, expectedRatio: 0.03125 } // 3.125%
      ];

      testCases.forEach(({ hours, expectedRatio }) => {
        const testTime = new Date(baseTime.getTime() + hours * 60 * 60 * 1000);
        const actualConcentration = calculateConcentrationAtTime([dose], drug, testTime);
        const expectedConcentration = initialDose * expectedRatio;
        
        expect(actualConcentration).toBeCloseTo(expectedConcentration, 10);
      });
    });
  });

  describe('calculateTotalConcentration', () => {
    it('should return 0 when no doses are given', () => {
      const drug: Drug = { id: '1', name: 'Test', halfLife: 24, color: '#000' };
      const result = calculateTotalConcentration([], drug, Date.now());
      expect(result).toBe(0);
    });

    it('should ignore doses administered after the target time', () => {
      const drug: Drug = { id: '1', name: 'Test', halfLife: 24, color: '#000' };
      const baseTime = Date.now();
      
      const futureDose: DoseEntry = {
        id: '1',
        drugId: '1',
        initialDose: 100,
        administrationTime: new Date(baseTime + 1000) // 1 second in the future
      };

      const result = calculateTotalConcentration([futureDose], drug, baseTime);
      expect(result).toBe(0);
    });

    it('should return exact initial dose amount at administration time for single dose', () => {
      const drug: Drug = { id: '1', name: 'Test', halfLife: 24, color: '#000' };
      const adminTime = new Date('2024-01-01T12:00:00Z');
      
      const dose: DoseEntry = {
        id: '1',
        drugId: '1', 
        initialDose: 200,
        administrationTime: adminTime
      };

      // At the exact moment of administration, concentration should equal initial dose
      const result = calculateTotalConcentration([dose], drug, adminTime.getTime());
      expect(result).toBe(200);
    });

    it('should handle multiple doses correctly at administration times', () => {
      const drug: Drug = { id: '1', name: 'Test', halfLife: 24, color: '#000' };
      const baseTime = new Date('2024-01-01T12:00:00Z');
      
      const dose1: DoseEntry = {
        id: '1',
        drugId: '1',
        initialDose: 200,
        administrationTime: baseTime
      };

      const dose2: DoseEntry = {
        id: '2',
        drugId: '1',
        initialDose: 100,
        administrationTime: new Date(baseTime.getTime() + 12 * 60 * 60 * 1000) // 12 hours later
      };

      // At time of first dose: should be exactly 200mg
      const result1 = calculateTotalConcentration([dose1, dose2], drug, baseTime.getTime());
      expect(result1).toBe(200);

      // At time of second dose: should be first dose decayed + new dose
      const result2 = calculateTotalConcentration([dose1, dose2], drug, dose2.administrationTime.getTime());
      const expectedFromDose1 = 200 * Math.pow(0.5, 0.5); // 0.5 half-lives = 12hrs/24hrs
      const expectedTotal = expectedFromDose1 + 100;
      expect(result2).toBeCloseTo(expectedTotal, 10);
    });

    it('should reproduce the regression: single 200mg dose shows as 221.90mg bug', () => {
      // This test reproduces the exact scenario from the bug report
      const drug: Drug = { 
        id: 'levothyroxine-id', 
        name: 'levothyroxine', 
        halfLife: 24, 
        color: '#000' 
      };
      
      // Simulate the exact time mentioned in the bug report
      const adminTime = new Date('2025-08-10T09:30:00.000Z');
      
      const dose: DoseEntry = {
        id: 'dose-1',
        drugId: 'levothyroxine-id',
        initialDose: 200,
        administrationTime: adminTime
      };

      // At the exact moment of administration, should be exactly 200mg, not 221.90mg
      const result = calculateTotalConcentration([dose], drug, adminTime.getTime());
      expect(result).toBe(200);
      expect(result).not.toBeCloseTo(221.90, 2);
    });

    it('should correctly handle dose deletion scenario: stale calculation bug', () => {
      // This test reproduces the user's scenario: had multiple doses, deleted earlier ones
      const drug: Drug = { 
        id: 'levothyroxine-id', 
        name: 'levothyroxine', 
        halfLife: 24, 
        color: '#000' 
      };
      
      const baseTime = new Date('2025-08-09T09:30:00.000Z');
      
      // Original scenario: multiple doses
      const dose1: DoseEntry = {
        id: 'dose-1',
        drugId: 'levothyroxine-id',
        initialDose: 100,
        administrationTime: baseTime
      };
      
      const dose2: DoseEntry = {
        id: 'dose-2', 
        drugId: 'levothyroxine-id',
        initialDose: 50,
        administrationTime: new Date(baseTime.getTime() + 6 * 60 * 60 * 1000) // 6 hours later
      };
      
      const dose3: DoseEntry = {
        id: 'dose-3',
        drugId: 'levothyroxine-id', 
        initialDose: 200,
        administrationTime: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000) // 24 hours later
      };

      const allDoses = [dose1, dose2, dose3];

      // Test with all doses: dose3 should include contributions from dose1 and dose2
      const concentrationWithAllDoses = calculateTotalConcentration(
        allDoses, 
        drug, 
        dose3.administrationTime.getTime()
      );
      
      // Expected: dose1 (100mg after 24h = 50mg) + dose2 (50mg after 18h ≈ 41.5mg) + dose3 (200mg) 
      const expectedFromDose1 = 100 * Math.pow(0.5, 1); // 1 half-life = 50mg
      const expectedFromDose2 = 50 * Math.pow(0.5, 18/24); // 0.75 half-lives ≈ 37.84mg
      const expectedFromDose3 = 200; // just administered
      const expectedTotal = expectedFromDose1 + expectedFromDose2 + expectedFromDose3;
      
      expect(concentrationWithAllDoses).toBeCloseTo(expectedTotal, 2);

      // Now simulate deletion: remove dose1 and dose2 (earlier doses)
      const dosesAfterDeletion = [dose3]; // Only dose3 remains

      // Test after deletion: dose3 should now show exactly 200mg, not the cumulative amount
      const concentrationAfterDeletion = calculateTotalConcentration(
        dosesAfterDeletion,
        drug,
        dose3.administrationTime.getTime()
      );
      
      expect(concentrationAfterDeletion).toBe(200);
      expect(concentrationAfterDeletion).not.toBeCloseTo(concentrationWithAllDoses, 2);
      
      // This should be 200mg, NOT ~287.84mg (which would be the old cumulative)
      expect(concentrationAfterDeletion).not.toBeCloseTo(287.84, 2);
    });
  });
}); 