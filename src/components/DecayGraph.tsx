import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Drug, DoseEntry, DataPoint, TimeRange } from '../types';
import { calculateTotalConcentration } from '../utils/doseCalculations';

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DecayGraphProps {
  drugs: Drug[];
  doseEntries: DoseEntry[];
  timeRange: TimeRange;
  isDarkMode: boolean;
  onDeleteDose: (doseId: string) => void;
}

const DecayGraph: React.FC<DecayGraphProps> = ({
  drugs,
  doseEntries,
  timeRange,
  isDarkMode,
  onDeleteDose,
}) => {
  const chartRef = useRef<ChartJS<'line', DataPoint[], unknown>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<{
    datasetIndex: number;
    index: number;
    x: number;
    y: number;
    doseId?: string;
  } | null>(null);

  const textColor = isDarkMode ? '#e0e0e0' : '#333333';
  const gridColor = isDarkMode ? '#404040' : '#cccccc';

  // Group doses by drug
  const plottedDrugs = useMemo(() => {
    const drugMap = new Map<string, { drug: Drug; doses: DoseEntry[] }>();
    
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

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedPoint(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeletePoint = (doseId: string) => {
    if (doseId) {
      onDeleteDose(doseId);
    }
    setSelectedPoint(null);
  };

  const calculateDecayPoints = (drug: Drug, doses: DoseEntry[]): DataPoint[] => {
    if (doses.length === 0) return [];

    const startTime = timeRange.start.getTime();
    const endTime = timeRange.end.getTime();
    const totalDuration = endTime - startTime;
    
    // Adaptive sampling: more points for longer time ranges, minimum density based on half-life
    const halfLifeMs = drug.halfLife * 60 * 60 * 1000;
    const minPointsPerHalfLife = 10; // Ensure smooth decay curves
    const basePoints = Math.max(200, totalDuration / halfLifeMs * minPointsPerHalfLife);
    
    // Cap the points to prevent performance issues, but ensure minimum quality
    const maxPoints = 2000;
    const numPoints = Math.min(maxPoints, Math.max(basePoints, 100));
    
    // Create sampling points that include all dose times plus regular intervals
    const sampleTimes = new Set<number>();
    
    // Add dose administration times for accurate dose markers
    doses.forEach(dose => {
      const doseTime = dose.administrationTime.getTime();
      if (doseTime >= startTime && doseTime <= endTime) {
        sampleTimes.add(doseTime);
        // Add points around dose times for better curve resolution
        sampleTimes.add(Math.max(startTime, doseTime - halfLifeMs * 0.1));
        sampleTimes.add(Math.min(endTime, doseTime + halfLifeMs * 0.1));
      }
    });
    
    // Add regular sampling points
    const step = totalDuration / numPoints;
    for (let i = 0; i <= numPoints; i++) {
      sampleTimes.add(startTime + i * step);
    }
    
    // Convert to sorted array
    const sortedTimes = Array.from(sampleTimes).sort((a, b) => a - b);
    
    // Calculate concentrations at each sample time using the utility function
    const points: DataPoint[] = [];
    for (const time of sortedTimes) {
      const concentration = calculateTotalConcentration(doses, drug, time);
      points.push({ x: new Date(time), y: concentration });
    }
    
    return points;
  };

  const datasets = plottedDrugs.map(({ drug, doses }, index) => {
    const decayPoints = calculateDecayPoints(drug, doses);
    
    // Create dose markers - actual points where doses were administered
    const doseMarkers = doses
      .filter(dose => {
        const doseTime = dose.administrationTime.getTime();
        return doseTime >= timeRange.start.getTime() && doseTime <= timeRange.end.getTime();
      })
      .map(dose => {
        // Calculate the concentration at the exact dose time using utility function
        const concentration = calculateTotalConcentration(doses, drug, dose.administrationTime.getTime());
        return {
          x: dose.administrationTime,
          y: concentration,
          doseId: dose.id,
          isDosePoint: true
        };
      });

    return [
      // Main decay curve
      {
        label: drug.name,
        data: decayPoints,
        borderColor: drug.color,
        backgroundColor: drug.color,
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0.1,
      },
      // Dose markers
      {
        label: `${drug.name} Doses`,
        data: doseMarkers,
        borderColor: 'transparent',
        backgroundColor: drug.color,
        pointBackgroundColor: (context: any) => {
          if (selectedPoint && 
              selectedPoint.datasetIndex === index * 2 + 1 && 
              selectedPoint.index === context.dataIndex) {
            return isDarkMode ? '#ffffff' : '#000000';
          }
          return drug.color;
        },
        pointBorderColor: isDarkMode ? '#ffffff' : '#000000',
        pointBorderWidth: 2,
        pointRadius: (context: any) => {
          if (selectedPoint && 
              selectedPoint.datasetIndex === index * 2 + 1 && 
              selectedPoint.index === context.dataIndex) {
            return 8;
          }
          return 6;
        },
        showLine: false,
        pointHoverRadius: 8,
      }
    ];
  }).flat();

  const data: ChartData<'line', DataPoint[]> = {
    datasets
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    animation: {
      duration: 0
    },
    plugins: {
      tooltip: {
        enabled: false, // Disable default tooltip
      },
      legend: {
        labels: {
          color: textColor,
          font: {
            size: 14,
          },
          filter: (legendItem: any) => {
            // Only show decay curves in legend (even dataset indices)
            return legendItem.datasetIndex % 2 === 0;
          },
        },
      },
    },
    onClick: (event: any, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const chart = chartRef.current;
        const container = containerRef.current;
        if (!chart || !container) return;

        // Only handle clicks on dose marker datasets (odd indices)
        if (element.datasetIndex % 2 === 0) {
          setSelectedPoint(null);
          return;
        }

        const pointElement = chart.getDatasetMeta(element.datasetIndex).data[element.index];
        const centerPoint = pointElement.getProps(['x', 'y'], true);
        const dataPoint = datasets[element.datasetIndex].data[element.index];

        setSelectedPoint({
          datasetIndex: element.datasetIndex,
          index: element.index,
          x: centerPoint.x,
          y: centerPoint.y,
          doseId: dataPoint.doseId
        });
      } else {
        setSelectedPoint(null);
      }
    },
    onHover: (event, elements) => {
      if (!selectedPoint && event?.native?.target) {
        (event.native.target as HTMLElement).style.cursor = elements.length ? 'pointer' : 'default';
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d'
          }
        },
        ticks: {
          source: 'data',
          autoSkip: false,
          color: textColor,
          font: {
            size: 12
          }
        },
        grid: {
          display: true,
          color: gridColor,
          drawOnChartArea: true,
        },
        title: {
          display: true,
          text: 'Time',
          color: textColor,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        min: timeRange.start.getTime(),
        max: timeRange.end.getTime(),
      },
      y: {
        title: {
          display: true,
          text: 'Dose (mg)',
          color: textColor,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          display: true,
          color: gridColor,
          drawOnChartArea: true,
        },
        ticks: {
          color: textColor,
          font: {
            size: 12
          }
        },
        beginAtZero: true,
        min: 0,
      },
    },
  };

  return (
    <div 
      ref={containerRef} 
      style={{
        width: '100%',
        maxWidth: '100%',
        height: '400px',
        padding: '16px',
        position: 'relative'
      }}
    >
      {selectedPoint && (
        <>
          <div 
            ref={(el) => {
              if (el) {
                el.style.transform = `translate(calc(${selectedPoint.x}px - 50%), calc(${selectedPoint.y}px - 100% - 10px))`;
              }
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              backgroundColor: isDarkMode ? '#333' : '#fff',
              border: `1px solid ${gridColor}`,
              padding: '8px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000,
              pointerEvents: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{
              position: 'relative',
              marginBottom: '4px'
            }}>
              {new Date(datasets[selectedPoint.datasetIndex].data[selectedPoint.index].x).toLocaleString()}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>
                {plottedDrugs[Math.floor(selectedPoint.datasetIndex / 2)].drug.name}: {datasets[selectedPoint.datasetIndex].data[selectedPoint.index].y.toFixed(2)} mg
              </span>
              <button 
                onClick={() => selectedPoint.doseId && handleDeletePoint(selectedPoint.doseId)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#ff4444',
                  border: 'none',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              backgroundColor: isDarkMode ? '#333' : '#fff',
              border: `1px solid ${gridColor}`,
              borderTop: 'none',
              borderLeft: 'none'
            }} />
          </div>
        </>
      )}
      <div className="graph-container" style={{ width: '100%', height: '100%' }}>
        <Line 
          ref={chartRef}
          data={data} 
          options={options}
          redraw={false}
        />
      </div>
    </div>
  );
};

export default DecayGraph;
