import { Component, createSignal, onMount, createEffect } from 'solid-js';
import { statsStore } from '../stores/statsStore';
import { configStore } from '../stores/configStore';

const Charts: Component = () => {
  const [isLoading, setIsLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;
  let chartInstance: any = null;

  // Initialize data fetching
  onMount(async () => {
    try {
      console.log('Charts component mounted, fetching member history...');
      await statsStore.fetchMemberHistory();
    } catch (error) {
      console.error('Error fetching member history:', error);
    } finally {
      setIsLoading(false);
    }
  });

  // Create chart when data becomes available
  createEffect(async () => {
    if (isLoading()) return;
    
    const memberHistory = statsStore.memberHistory;
    console.log('Chart effect triggered - history length:', memberHistory.length);
    
    if (!canvasRef || memberHistory.length === 0) {
      console.log('Cannot create chart: canvas=', !!canvasRef, 'data=', memberHistory.length);
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
  });

  // Computed value for whether we have data
  const hasData = () => !isLoading() && statsStore.memberHistory.length > 0;

  return (
    <div class="chart-container">
      <h3>📈 Activity Chart</h3>
      
      {isLoading() ? (
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">Loading chart data...</div>
        </div>
      ) : !hasData() ? (
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-text">No event data available</div>
          <div class="empty-subtext">{configStore.config.name} event data will appear here during the event period</div>
        </div>
      ) : (
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
        </>
      )}
      
      {hasData() && (
        <div class="chart-footer">
          <div class="chart-hint">
            🎮 Assembly Summer 2025 Discord Activity
          </div>
        </div>
      )}
    </div>
  );
};

export default Charts;
