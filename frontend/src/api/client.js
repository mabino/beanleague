// Determine API Base URL supporting root and /beanleague subpath automatically
const getApiBase = () => {
  if (import.meta.env.VITE_API_URL !== undefined) {
    return import.meta.env.VITE_API_URL;
  }
  return window.location.pathname.startsWith('/beanleague') ? '/beanleague' : '';
};

export const API_BASE = getApiBase();

export const api = {
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const url = `${getApiBase()}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data?.detail?.message || data?.detail || (Array.isArray(data?.detail?.errors) ? data.detail.errors.join(", ") : "API request failed");
      const err = new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      err.data = data;
      throw err;
    }
    return data;
  },

  // Leagues & Standings
  getLeague(seasonCode) {
    return this.request(`/api/leagues/${seasonCode}`);
  },

  getStandings(seasonCode) {
    return this.request(`/api/leagues/${seasonCode}/standings`);
  },

  // Team & Auth
  createTeam(seasonCode, teamName, formation = "4-3-3", recoveryPlayer1Id = null, recoveryPlayer2Id = null, recoveryPlayer3Id = null, secretWord = "") {
    return this.request("/api/teams", {
      method: "POST",
      body: JSON.stringify({
        season_code: seasonCode,
        team_name: teamName,
        formation,
        recovery_player_1_id: recoveryPlayer1Id,
        recovery_player_2_id: recoveryPlayer2Id,
        recovery_player_3_id: recoveryPlayer3Id,
        secret_word: secretWord
      }),
    });
  },

  loginTeam(managerCode) {
    return this.request("/api/teams/login", {
      method: "POST",
      body: JSON.stringify({ manager_code: managerCode }),
    });
  },

  recoverTeam(seasonCode, player1Id, player2Id, player3Id, secretWord) {
    return this.request("/api/teams/recover", {
      method: "POST",
      body: JSON.stringify({
        season_code: seasonCode,
        player_1_id: player1Id,
        player_2_id: player2Id,
        player_3_id: player3Id,
        secret_word: secretWord,
      }),
    });
  },

  getMyRoster(managerCode) {
    return this.request("/api/teams/me", {
      headers: { Authorization: `Bearer ${managerCode}` },
    });
  },

  saveMyRoster(managerCode, formation, players) {
    return this.request("/api/teams/me/roster", {
      method: "PUT",
      headers: { Authorization: `Bearer ${managerCode}` },
      body: JSON.stringify({ formation, players }),
    });
  },

  updateTeamKit(managerCode, kitConfig) {
    return this.request("/api/teams/me/kit", {
      method: "PUT",
      headers: { Authorization: `Bearer ${managerCode}` },
      body: JSON.stringify({ kit_config: kitConfig }),
    });
  },

  updatePlayerMedia(managerCode, playerId, { youtube_links, custom_notes }) {
    return this.request(`/api/teams/me/players/${playerId}/media`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${managerCode}` },
      body: JSON.stringify({ youtube_links, custom_notes }),
    });
  },

  getTeamPublic(teamId) {
    return this.request(`/api/teams/${teamId}`);
  },

  // Players Directory
  getPlayers(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "" && v !== "undefined")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return this.request(`/api/players${query ? `?${query}` : ""}`);
  },

  getPlayerDetails(id) {
    return this.request(`/api/players/${id}`);
  },

  // Fixtures
  getFixtures(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "" && v !== "undefined")
    );
    const query = new URLSearchParams(cleanParams).toString();
    return this.request(`/api/fixtures${query ? `?${query}` : ""}`);
  },

  // Live & Admin
  getRecentEvents() {
    return this.request("/api/events/recent");
  },

  getApiUsage() {
    return this.request("/api/admin/usage");
  },

  simulateTick() {
    return this.request("/api/admin/simulate-tick", { method: "POST" });
  },

  triggerSeeder() {
    return this.request("/api/admin/seed", { method: "POST" });
  },

  triggerPoller() {
    return this.request("/api/admin/poll", { method: "POST" });
  }
};
