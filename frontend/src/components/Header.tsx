import { Component } from 'solid-js';
import { configStore } from '../stores/configStore';

const Header: Component = () => {
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
            {configStore.eventName}
          </h1>
          <div class="subtitle">
            <span class="event-name">Discord Activity Tracker</span>
            <span class={`event-status ${getEventStatus().class}`}>
              {getEventStatus().text}
            </span>
          </div>
          <div class="event-dates">
            {formatDate(configStore.startDate)} - {formatDate(configStore.endDate)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
