import React, { useState } from 'react';
import { Drug } from '../types';

interface DrugDefinitionFormProps {
  onSubmit: (drug: Drug) => void;
}

const DrugDefinitionForm: React.FC<DrugDefinitionFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [halfLife, setHalfLife] = useState('');

  const generateRandomColor = () => {
    const hue = Math.random() * 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const drug: Drug = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      halfLife: parseFloat(halfLife),
      color: generateRandomColor(),
    };
    onSubmit(drug);
    setName('');
    setHalfLife('');
  };

  return (
    <form onSubmit={handleSubmit} className="drug-form">
      <h2>Define New Drug</h2>
      <div>
        <label>Drug Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Half Life (hours):</label>
        <input
          type="number"
          value={halfLife}
          onChange={(e) => setHalfLife(e.target.value)}
          required
          min="0"
          step="0.1"
        />
      </div>
      <button type="submit">Add Drug Definition</button>
    </form>
  );
};

export default DrugDefinitionForm;
