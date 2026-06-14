import { ROUTE_TYPES, PLAYER_COLORS } from '../data/formations';

const TYPE_COLORS = {
  pass: '#4ecdc4',
  run: '#ff6b35',
  block: '#ffe66d',
  motion: '#c77dff',
};

const ROUTE_GROUPS = {
  'Pass Routes': ['go', 'slant', 'out', 'in', 'curl', 'comeback', 'corner', 'post', 'hitch', 'flat', 'wheel', 'seam', 'cross', 'angle', 'screen', 'swing', 'drag', 'over'],
  'Run Paths': ['run_inside', 'run_outside', 'run_power', 'run_counter', 'run_draw', 'run_sweep', 'run_dive'],
  'Blocking': ['block_pass', 'block_run', 'block_pull', 'block_chip'],
  'Motion': ['motion_left', 'motion_right'],
};

export default function RouteAssigner({ selectedPlayer, currentAssignment, onAssign, playerLabel }) {
  if (!selectedPlayer) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        Click a player on the field to assign a route
      </div>
    );
  }

  const playerColor = PLAYER_COLORS[selectedPlayer] || '#888';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: playerColor }}
          />
          <span style={{ color: playerColor }}>
            {playerLabel || selectedPlayer}
          </span>
        </h3>
        {currentAssignment && (
          <button
            onClick={() => onAssign(selectedPlayer, null)}
            className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded hover:bg-red-900"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {Object.entries(ROUTE_GROUPS).map(([groupName, routes]) => {
          const groupColor = TYPE_COLORS[ROUTE_TYPES[routes[0]]?.type] || '#888';
          return (
            <div key={groupName}>
              <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
                {groupName}
              </div>
              <div className="flex flex-wrap gap-1">
                {routes.map((routeKey) => {
                  const route = ROUTE_TYPES[routeKey];
                  const isActive = currentAssignment === routeKey;
                  return (
                    <button
                      key={routeKey}
                      onClick={() => onAssign(selectedPlayer, routeKey)}
                      className={`text-[11px] px-2 py-1 rounded transition-all ${
                        isActive
                          ? 'ring-2 ring-white font-bold'
                          : 'hover:brightness-125'
                      }`}
                      style={{
                        backgroundColor: isActive ? groupColor : `${groupColor}22`,
                        color: isActive ? '#1a1a2e' : groupColor,
                        border: `1px solid ${groupColor}44`,
                      }}
                    >
                      {route.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
