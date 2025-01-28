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
import { Drug, DoseEntry, DataPoint, PlottedDrug, TimeRange } from '../types';
import { useTheme } from '../hooks/useTheme';

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
  plottedDrugs: Array<{
    drug: Drug;
    doses: DoseEntry[];
  }>;
  timeRange: TimeRange;
  isDarkMode: boolean;
  onDeleteDose: (doseId: string) => void;
}

const DecayGraph: React.FC<DecayGraphProps> = ({
  plottedDrugs,
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

    const points: DataPoint[] = [];
    const startTime = timeRange.start.getTime();
    const endTime = timeRange.end.getTime();
    const step = (endTime - startTime) / 100;

    for (let time = startTime; time <= endTime; time += step) {
      let concentration = 0;
      for (const dose of doses) {
        const timeSinceAdmin = time - dose.administrationTime.getTime();
        if (timeSinceAdmin >= 0) {
          const halfLives = timeSinceAdmin / (drug.halfLife * 60 * 60 * 1000);
          concentration += dose.initialDose * Math.pow(0.5, halfLives);
        }
      }
      points.push({ x: new Date(time), y: concentration });
    }
    return points;
  };

  const datasets = plottedDrugs.map(({ drug, doses }, index) => ({
    label: drug.name,
    data: calculateDecayPoints(drug, doses).map(point => ({
      ...point,
      doseId: doses.find(dose => 
        dose.administrationTime.getTime() === (typeof point.x === 'number' ? point.x : new Date(point.x).getTime())
      )?.id
    })),
    borderColor: drug.color,
    backgroundColor: drug.color,
    pointBackgroundColor: (context: any) => {
      if (selectedPoint && 
          selectedPoint.datasetIndex === index && 
          selectedPoint.index === context.dataIndex) {
        return isDarkMode ? '#ffffff' : '#000000';
      }
      return drug.color;
    },
    pointBorderColor: drug.color,
    pointBorderWidth: (context: any) => {
      if (selectedPoint && 
          selectedPoint.datasetIndex === index && 
          selectedPoint.index === context.dataIndex) {
        return 2;
      }
      return 1;
    },
    pointRadius: (context: any) => {
      if (selectedPoint && 
          selectedPoint.datasetIndex === index && 
          selectedPoint.index === context.dataIndex) {
        return 5;
      }
      return 3;
    },
    fill: false,
    tension: 0.1,
  }));

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
        },
      },
    },
    onClick: (event: any, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const chart = chartRef.current;
        const container = containerRef.current;
        if (!chart || !container) return;

        // Get the point element from Chart.js
        const pointElement = chart.getDatasetMeta(element.datasetIndex).data[element.index];
        
        // Get the center position of the point
        const centerPoint = pointElement.getProps(['x', 'y'], true);

        console.log('Click coordinates:', {
          centerX: centerPoint.x,
          centerY: centerPoint.y,
          element
        });

        setSelectedPoint({
          datasetIndex: element.datasetIndex,
          index: element.index,
          x: centerPoint.x,
          y: centerPoint.y,
          doseId: datasets[element.datasetIndex].data[element.index].doseId
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
          {/* Debug marker for click position */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${selectedPoint.x}px, ${selectedPoint.y}px)`,
              width: '4px',
              height: '4px',
              backgroundColor: 'red',
              zIndex: 999,
            }}
          />
          <div 
            ref={(el) => {
              if (el) {
                const tooltipHeight = el.offsetHeight;
                const tooltipWidth = el.offsetWidth;
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
                {plottedDrugs[selectedPoint.datasetIndex].drug.name}: {datasets[selectedPoint.datasetIndex].data[selectedPoint.index].y.toFixed(2)} mg
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
