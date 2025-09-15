import { Component, For, Show } from 'solid-js';
import { statsStore } from '../stores/statsStore';

const RecentActivity: Component = () => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div class="card recent-activity">
      <div class="card-title">
        ⚡ Recent Activity
      </div>
      <div class="card-content">
        <Show 
          when={statsStore.recentActivity.length > 0}
          fallback={
            <div class="empty-state">
              <div class="empty-text">No recent activity</div>
            </div>
          }
        >
          <div class="activity-list">
            <For each={[...statsStore.recentActivity].reverse()}>
              {(activity) => (
                <div class="activity-item">
                  <div class="activity-icon">
                    {activity.action === 'started' ? '▶️' : '⏹️'}
                  </div>
                  <div class="activity-details">
                    <div class="activity-game">{activity.game_name}</div>
                    <div class="activity-info">
                      <span class="activity-action">
                        {activity.action === 'started' ? 'Started' : 'Stopped'}
                      </span>
                      {activity.session_duration && (
                        <span class="activity-duration">
                          • {formatDuration(activity.session_duration)}
                        </span>
                      )}
                    </div>
                    <div class="activity-time">{formatTime(activity.timestamp)}</div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default RecentActivity;
