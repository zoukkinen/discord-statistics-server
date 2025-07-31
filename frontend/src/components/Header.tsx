import { Component, createSignal } from 'solid-js';
import { configStore } from '../stores/configStore';

const Header: Component = () => {
  const [showModal, setShowModal] = createSignal(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: configStore.timezone
    });
  };

  const getEventStatus = () => {
    if (configStore.isEventActive) {
      return {
        text: `${configStore.daysRemaining} days remaining`,
        class: 'status-active'
      };
    } else if (configStore.daysUntilStart > 0) {
      return {
        text: `Starts in ${configStore.daysUntilStart} days`,
        class: 'status-upcoming'
      };
    } else {
      return {
        text: 'Event completed',
        class: 'status-completed'
      };
    }
  };

  return (
    <header class="header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="main-title">
            <span class="emoji">🎮</span>
            Discord Activity Tracker
          </h1>
          <div class="subtitle">
            <span class="event-name">{configStore.eventName}</span>
            <span class={`event-status ${getEventStatus().class}`}>
              {getEventStatus().text}
            </span>
          </div>
          <div class="event-dates">
            {formatDate(configStore.startDate)} - {formatDate(configStore.endDate)}
          </div>
        </div>
        
        <div class="header-actions">
          <button 
            class="info-button" 
            onClick={() => setShowModal(true)}
            title="About this tracker"
          >
            ℹ️ Info
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showModal() && (
        <div class="modal-overlay" onClick={() => setShowModal(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>🎮 Discord Activity Tracker</h2>
              <button 
                class="close-button" 
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            
            <div class="modal-body">
              <div class="modal-section">
                <h3>📊 Real-time Statistics</h3>
                <p>Track Discord server member activity and game statistics in real-time during {configStore.eventName}.</p>
              </div>

              <div class="modal-section">
                <h3>🎮 Game Activity Monitoring</h3>
                <p>Monitor what games community members are playing, with detailed session tracking and playtime statistics.</p>
              </div>

              <div class="modal-section">
                <h3>📈 Historical Data</h3>
                <p>View trends and patterns in community activity over the course of the event.</p>
              </div>

              <div class="modal-section">
                <h3>⚡ Live Updates</h3>
                <p>Dashboard refreshes automatically every 15 seconds to provide the most current information.</p>
              </div>
            </div>

            <div class="modal-footer">
              <p>Built with ❤️ for the gaming community</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
