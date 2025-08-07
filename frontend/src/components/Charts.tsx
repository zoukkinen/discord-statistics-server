import { Component, createSignal, onMount, createEffect } from 'solid-js';
import { statsStore } from '../stores/statsStore';
import { configStore } from '../stores/configStore';

interface ChartsProps {
  eventName?: string; // If provided, this is an event-specific view
}

const Charts: Component<ChartsProps> = (props) => {
  const [isLoading, setIsLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;
  let chartInstance: any = null;

  // Initialize data fetching only if not in event-specific mode
  onMount(async () => {
    console.log('Charts onMount - eventName prop:', props.eventName);
    if (props.eventName === undefined) {
      // Only fetch for main dashboard, not for event-specific views
      try {
        console.log('Charts component mounted, fetching member history for main dashboard...');
        await statsStore.fetchMemberHistory();
      } catch (error) {
        console.error('Error fetching member history:', error);
      }
    } else {
      console.log('Charts component mounted in event-specific mode, skipping fetch. Event:', props.eventName);
      console.log('Charts: Current store memberHistory length:', statsStore.memberHistory.length);
    }
    setIsLoading(false);
  });

  // Track store data changes
  createEffect(() => {
    const dataLength = statsStore.memberHistory.length;
    console.log('Charts: Store memberHistory changed, length:', dataLength);
  });

  // Create chart when data becomes available and canvas is ready
  createEffect(async () => {
    if (isLoading()) {
      console.log('Charts effect: still loading, skipping...');
      return;
    }
    
    const memberHistory = statsStore.memberHistory;
    console.log('Chart effect triggered - loading:', isLoading(), 'history length:', memberHistory.length);
    console.log('EventName prop:', props.eventName);
    console.log('Canvas ref status:', canvasRef ? 'available' : 'not available');
    
    if (!canvasRef || memberHistory.length === 0) {
      console.log('Cannot create chart: canvas=', !!canvasRef, 'canvasRef=', canvasRef, 'data=', memberHistory.length);
      // If we have data but no canvas, wait a bit and try again
      if (memberHistory.length > 0 && !canvasRef) {
        console.log('Retrying chart creation in 100ms...');
        setTimeout(() => {
          // Trigger the effect again by accessing the reactive signals
          if (canvasRef && statsStore.memberHistory.length > 0) {
            console.log('Retry: canvas now available, creating chart...');
            createChart();
          }
        }, 100);
      }
      return;
    }

    await createChart();
  });

  const createChart = async () => {
    if (!canvasRef) {
      console.log('createChart: canvas not available');
      return;
    }

    const memberHistory = statsStore.memberHistory;
    if (memberHistory.length === 0) {
      console.log('createChart: no data available');
      return;
    }

    try {
      // Destroy existing chart
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }

      console.log('Creating chart with Assembly Summer 2025 data:', memberHistory.length, 'points');
      if (memberHistory.length > 0) {
        console.log('Date range:', new Date(memberHistory[0].timestamp).toLocaleString(), 'to', new Date(memberHistory[memberHistory.length - 1].timestamp).toLocaleString());
        console.log('Member count range:', Math.min(...memberHistory.map(p => p.online_members)), 'to', Math.max(...memberHistory.map(p => p.online_members)), 'online members');
      }

      // Import Chart.js dynamically
      const { Chart, CategoryScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler, TimeScale } = await import('chart.js');
      
      // Register components
      Chart.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler, TimeScale);

      // Prepare chart data
      const data = {
        labels: memberHistory.map(point => {
          const date = new Date(point.timestamp);
          return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' }) + ' ' + date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false });
        }),
        datasets: [
          {
            label: 'Online Members',
            data: memberHistory.map(point => point.online_members),
            borderColor: '#00ff9d',
            backgroundColor: 'rgba(0, 255, 157, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 1,
            pointHoverRadius: 4,
            pointBackgroundColor: '#00ff9d',
          },
          {
            label: 'Total Members',
            data: memberHistory.map(point => point.total_members),
            borderColor: '#00a2ff',
            backgroundColor: 'rgba(0, 162, 255, 0.05)',
            borderWidth: 1,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 3,
            pointBackgroundColor: '#00a2ff',
          }
        ]
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: {
              color: '#ffffff',
              font: { size: 12 },
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#00ff9d',
            borderWidth: 1,
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#cccccc',
              maxTicksLimit: 8,
              maxRotation: 45
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#cccccc',
              stepSize: 1
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart' as const
        }
      };

      // Create chart
      chartInstance = new Chart(canvasRef, {
        type: 'line',
        data,
        options
      });

      console.log('Chart created successfully');
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  };

  // Computed value for whether we have data - make it reactive
  const hasData = () => {
    const dataLength = statsStore.memberHistory.length;
    const loading = isLoading();
    console.log('hasData check - loading:', loading, 'dataLength:', dataLength, 'eventName:', props.eventName);
    return !loading && dataLength > 0;
  };

  // Track hasData changes
  createEffect(() => {
    console.log('hasData() result:', hasData());
  });

  return (
    <div class="chart-container">
      <h3>📈 Activity Chart</h3>
      
      {isLoading() ? (
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">Loading chart data...</div>
        </div>
      ) : hasData() ? (
        <>
          <div class="chart-wrapper" style={{ height: '300px', position: 'relative' }}>
            <canvas 
              ref={canvasRef}
              style={{ 
                width: '100%', 
                height: '100%',
                'max-height': '300px'
              }}
            />
          </div>
          
          <div class="chart-footer">
            <div class="chart-hint">
              🎮 {props.eventName || configStore.config.name} Discord Activity ({statsStore.memberHistory.length} data points)
            </div>
          </div>
        </>
      ) : (
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-text">No event data available</div>
          <div class="empty-subtext">
            {props.eventName 
              ? `${props.eventName} data will appear here when available`
              : `${configStore.config.name} event data will appear here during the event period`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default Charts;
