const API_BASE = import.meta.env.VITE_API_URL || "";

export const api = {
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
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
  createTeam(seasonCode, teamName, formation = "4-3-3") {
    return this.request("/api/teams", {
      method: "POST",
      body: JSON.stringify({ season_code: seasonCode, team_name: teamName, formation }),
    });
  },

  loginTeam(managerCode) {
    return this.request("/api/teams/login", {
      method: "POST",
      body: JSON.stringify({ manager_code: managerCode }),
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

  getTeamPublic(teamId) {
    return this.request(`/api/teams/${teamId}`);
  },

  // Players Directory
  getPlayers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/players?${query}`);
  },

  getPlayerDetails(id) {
    return this.request(`/api/players/${id}`);
  },

  // Fixtures
  getFixtures(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/fixtures?${query}`);
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
