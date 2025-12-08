import { Component, For, createSignal } from "solid-js";
import { statsStore } from "../stores/statsStore";
import { configStore } from "../stores/configStore";

interface TopGamesProps {
  showAll?: boolean; // If true, show all games instead of limiting to top 8
}

const TopGames: Component<TopGamesProps> = (props) => {
  const [showAllGames, setShowAllGames] = createSignal(false);
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return days > 0 && remainingHours > 0
        ? `${days}d ${remainingHours}h`
        : `${days}d`;
    }
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${index + 1}`;
    }
  };

  const formatEventEndTime = () => {
    const config = configStore.config;
    if (!config?.endDate) return "";

    try {
      const endDate = new Date(config.endDate);
      if (isNaN(endDate.getTime())) return "";

      return `Event period: through ${endDate.toLocaleDateString()}`;
    } catch {
      return "";
    }
  };

  return (
    <div class="chart-container">
      <h3>🏆 Top Games</h3>

      {statsStore.isUpdating && statsStore.topGames.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <div class="empty-text">Loading games...</div>
        </div>
      ) : statsStore.topGames.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <div class="empty-text">No game data yet</div>
          <div class="empty-subtext">Start playing to see statistics!</div>
        </div>
      ) : (
        <>
          <div class="game-list">
            <For
              each={
                props.showAll
                  ? showAllGames()
                    ? statsStore.topGames
                    : statsStore.topGames.slice(0, 10)
                  : statsStore.topGames.slice(0, 8)
              }
            >
              {(game, index) => (
                <div class="game-item">
                  <span class="game-rank">{getRankEmoji(index())}</span>
                  <div class="game-info">
                    <div class="game-name" title={game.game_name}>
                      {game.game_name}
                    </div>
                    <div class="game-stats">
                      {formatTime(game.total_minutes)} • {game.unique_players}{" "}
                      players
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {props.showAll &&
            statsStore.topGames.length > 10 &&
            !showAllGames() && (
              <button
                class="show-more-button"
                onClick={() => setShowAllGames(true)}
              >
                Show More ({statsStore.topGames.length - 10} more games)
              </button>
            )}
        </>
      )}

      <div class="last-updated">{formatEventEndTime()}</div>
    </div>
  );
};

export default TopGames;
