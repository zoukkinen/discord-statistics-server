import { Component, createSignal } from 'solid-js';
import { configStore } from '../stores/configStore';

const Footer: Component = () => {
  const [showModal, setShowModal] = createSignal(false);

  return (
    <>
      <footer class="footer">
        <div class="footer-content">
          <div class="footer-left">
            <p>Built with ❤️ for the gaming community</p>
          </div>
          
          <div class="footer-right">
            <button 
              class="info-button" 
              onClick={() => setShowModal(true)}
              title="About this tracker"
            >
              ℹ️ Info
            </button>
          </div>
        </div>
      </footer>

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
                <h3>📊 What We Track</h3>
                <ul>
                  <li><strong>Discord Server Activity:</strong> Number of online members and total server members</li>
                  <li><strong>Game Activity:</strong> What games Discord users are currently playing</li>
                  <li><strong>Historical Data:</strong> Member count trends and game popularity over time</li>
                  <li><strong>Statistics:</strong> Total unique games played and player counts during the event</li>
                </ul>
              </div>

              <div class="modal-section">
                <h3>🔍 How It Works</h3>
                <ul>
                  <li>The bot monitors the Discord server every 2 minutes</li>
                  <li>Only public Discord activity is tracked (games shown in user status)</li>
                  <li>No personal messages, conversations, or private data is collected</li>
                  <li>Data is aggregated and anonymized for statistical purposes</li>
                  <li>Dashboard updates in real-time to show current activity</li>
                </ul>
              </div>

              <div class="modal-section">
                <h3>⏰ Event Timeframe</h3>
                <p>Data collection is limited to the official {configStore.eventName} event period:</p>
                <p>
                  <strong>Start:</strong> {new Intl.DateTimeFormat('en-GB', { 
                    day: 'numeric',
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                    timeZone: configStore.timezone
                  }).format(configStore.startDate)}<br/>
                  <strong>End:</strong> {new Intl.DateTimeFormat('en-GB', { 
                    day: 'numeric',
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                    timeZone: configStore.timezone
                  }).format(configStore.endDate)}
                </p>
              </div>

              <div class="modal-section">
                <h3>🛡️ Privacy</h3>
                <ul>
                  <li>No usernames or personal identifiers are stored</li>
                  <li>Only public Discord "Playing" status is tracked</li>
                  <li>Data is used solely for event statistics</li>
                  <li>All data is automatically deleted after the event</li>
                </ul>
              </div>
            </div>

            <div class="modal-footer">
              <p>Made with ❤️ for {configStore.eventName} community</p>
              <p><a href="https://github.com/zoukkinen" target="_blank" rel="noopener noreferrer">🔗 GitHub: @zoukkinen</a></p>
              <p><a href="https://github.com/zoukkinen/discord-statistics-server" target="_blank" rel="noopener noreferrer">📂 View Source Code</a></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
