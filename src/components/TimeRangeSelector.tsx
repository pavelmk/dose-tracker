import React, { useState, useEffect } from 'react';
import { TimeRange, DoseEntry } from '../types';
import './TimeRangeSelector.css';

interface TimeRangeSelectorProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  doseEntries: DoseEntry[];
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  timeRange,
  onTimeRangeChange,
  doseEntries,
}) => {
  const [localTimeRange, setLocalTimeRange] = useState(timeRange);

  useEffect(() => {
    setLocalTimeRange(timeRange);
  }, [timeRange]);

  const calculateBoundaries = (): { min: Date; max: Date } => {
    if (doseEntries.length === 0) {
      const now = new Date();
      return {
        min: new Date(now.getTime() - 24 * 3600000),
        max: new Date(now.getTime() + 24 * 3600000 * 365), // Allow up to a year in the future
      };
    }

    const times = doseEntries.map(dose => dose.administrationTime.getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      min: new Date(minTime - 24 * 3600000),
      max: new Date(maxTime + 24 * 3600000 * 365), // Allow up to a year after the last dose
    };
  };

  const boundaries = calculateBoundaries();
  const minTime = boundaries.min.getTime();
  const maxTime = boundaries.max.getTime();

  // Convert time to percentage for visual display
  const getTimePercentage = (time: Date): number => {
    const totalRange = maxTime - minTime;
    const timeDiff = time.getTime() - minTime;
    return (timeDiff / totalRange) * 100;
  };

  const handleSliderChange = (side: 'start' | 'end', value: string) => {
    const timestamp = parseInt(value, 10);
    const newTime = new Date(timestamp);
    const newRange = {
      ...localTimeRange,
      [side]: newTime
    };
    setLocalTimeRange(newRange);
    onTimeRangeChange(newRange);
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = new Date(e.target.value);
    const newRange = {
      ...localTimeRange,
      start: newStart
    };
    setLocalTimeRange(newRange);
    onTimeRangeChange(newRange);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = new Date(e.target.value);
    const newRange = {
      ...localTimeRange,
      end: newEnd
    };
    setLocalTimeRange(newRange);
    onTimeRangeChange(newRange);
  };

  return (
    <div className="time-range-selector">
      <div className="time-inputs">
        <div className="time-input">
          <label>Start:</label>
          <input
            type="datetime-local"
            value={localTimeRange.start.toISOString().slice(0, 16)}
            onChange={handleStartChange}
            min={boundaries.min.toISOString().slice(0, 16)}
          />
        </div>
        <div className="time-input">
          <label>End:</label>
          <input
            type="datetime-local"
            value={localTimeRange.end.toISOString().slice(0, 16)}
            onChange={handleEndChange}
            min={boundaries.min.toISOString().slice(0, 16)}
          />
        </div>
      </div>
      <div className="slider-container">
        <div 
          className="slider-track"
          style={{
            left: `${getTimePercentage(localTimeRange.start)}%`,
            right: `${100 - getTimePercentage(localTimeRange.end)}%`
          }}
        />
        <input
          type="range"
          min={minTime}
          max={maxTime}
          step="60000"
          value={localTimeRange.start.getTime()}
          onChange={(e) => handleSliderChange('start', e.target.value)}
          className="range-input start"
        />
        <input
          type="range"
          min={minTime}
          max={maxTime}
          step="60000"
          value={localTimeRange.end.getTime()}
          onChange={(e) => handleSliderChange('end', e.target.value)}
          className="range-input end"
        />
      </div>
    </div>
  );
};

export default TimeRangeSelector;
