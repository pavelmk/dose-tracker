import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Drug, DoseEntry } from '../types';

interface DoseFormProps {
  drugs: Drug[];
  onSubmit: (dose: DoseEntry) => void;
  doseEntries: DoseEntry[];
  selectedDrug: Drug | null;
  onDrugSelect: (drug: Drug | null) => void;
}

const DoseForm: React.FC<DoseFormProps> = ({ 
  drugs, 
  onSubmit, 
  doseEntries, 
  selectedDrug,
  onDrugSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState(selectedDrug?.name || '');
  const [selectedDrugId, setSelectedDrugId] = useState(selectedDrug?.id || '');
  const [initialDose, setInitialDose] = useState('');
  const [administrationTime, setAdministrationTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedDrug) {
      setSelectedDrugId(selectedDrug.id);
      setSearchTerm(selectedDrug.name);
      setIsDropdownVisible(false);
    }
  }, [selectedDrug]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDrugs = useMemo(() => {
    if (!searchTerm) return drugs;
    const lowerSearch = searchTerm.toLowerCase();
    return drugs.filter(drug => 
      drug.name.toLowerCase().includes(lowerSearch)
    );
  }, [drugs, searchTerm]);

  // Check if current search term matches any drug
  const isValidDrug = !searchTerm || drugs.some(drug => 
    drug.name.toLowerCase() === searchTerm.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that selected drug exists
    const drugExists = drugs.some(drug => 
      drug.name.toLowerCase() === searchTerm.toLowerCase() && 
      drug.id === selectedDrugId
    );

    if (!drugExists) {
      return;
    }

    const dose: DoseEntry = {
      id: Math.random().toString(36).substr(2, 9),
      drugId: selectedDrugId,
      initialDose: parseFloat(initialDose),
      administrationTime: new Date(administrationTime),
    };
    onSubmit(dose);
    setInitialDose('');
  };

  const handleDrugSelect = (drug: Drug) => {
    setSelectedDrugId(drug.id);
    setSearchTerm(drug.name);
    setIsDropdownVisible(false);
    onDrugSelect(drug);  // Update parent's state
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownVisible(true);

    // If search is empty, clear selection
    if (!value) {
      setSelectedDrugId('');
      onDrugSelect(null);
    }
  };

  const handleRedose = () => {
    if (doseEntries.length === 0) return;
    
    // Sort doses by administration time to get the latest one
    const sortedDoses = [...doseEntries].sort((a, b) => 
      b.administrationTime.getTime() - a.administrationTime.getTime()
    );
    const latestDose = sortedDoses[0];
    
    // Create new dose 24 hours after the latest dose
    const newDoseTime = new Date(latestDose.administrationTime.getTime() + 24 * 60 * 60 * 1000);
    
    const dose: DoseEntry = {
      id: Math.random().toString(36).substr(2, 9),
      drugId: latestDose.drugId,
      initialDose: latestDose.initialDose,
      administrationTime: newDoseTime,
    };
    onSubmit(dose);
  };

  return (
    <form onSubmit={handleSubmit} className="dose-form">
      <h2>Add Dose Entry</h2>
      <div className="drug-search">
        <label>Select Drug:</label>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setIsDropdownVisible(true)}
          required
          placeholder="Type to search drugs..."
          style={{
            borderColor: !isValidDrug ? '#ff4444' : undefined
          }}
        />
        {!isValidDrug && (
          <div style={{ color: '#ff4444', fontSize: '0.8em', marginTop: '4px' }}>
            Please select a valid drug from the list
          </div>
        )}
        {isDropdownVisible && filteredDrugs.length > 0 && (
          <div ref={dropdownRef} className="dropdown">
            {filteredDrugs.map(drug => (
              <div
                key={drug.id}
                className="dropdown-item"
                onClick={() => handleDrugSelect(drug)}
              >
                {drug.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label>Dose (mg):</label>
        <input
          type="number"
          value={initialDose}
          onChange={(e) => setInitialDose(e.target.value)}
          required
          min="0"
          step="0.00001"
        />
      </div>
      <div className="time-input">
        <label>Administration Time:</label>
        <input
          type="datetime-local"
          value={administrationTime}
          onChange={(e) => setAdministrationTime(e.target.value)}
          required
        />
      </div>
      <div>
        <button type="submit" className="primary" disabled={!selectedDrugId}>Add Dose</button>
        {doseEntries.length > 0 && (
          <button 
            type="button" 
            onClick={handleRedose}
            className="secondary"
          >
            Re-dose 24hrs later
          </button>
        )}
      </div>
    </form>
  );
};

export default DoseForm;
