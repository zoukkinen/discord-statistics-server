import { Component } from 'solid-js';

const RecentActivity: Component = () => {
  return (
    <div class="card recent-activity">
      <div class="card-title">
        ⚡ Recent Activity
      </div>
      <div class="card-content">
        <div class="empty-state">
          <div class="empty-text">Recent activity will appear here</div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
