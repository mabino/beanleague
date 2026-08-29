import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [managerCode, setManagerCode] = useState(() => localStorage.getItem("beanleague_pin") || "");
  const [seasonCode, setSeasonCode] = useState(() => localStorage.getItem("beanleague_season") || "BARCA-2026");
  const [team, setTeam] = useState(null);
  const [roster, setRoster] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchTeamData = async (pin) => {
    if (!pin) {
      setTeam(null);
      setRoster(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const rosterData = await api.getMyRoster(pin);
      setRoster(rosterData);
      setTeam({
        id: rosterData.team_id,
        team_name: rosterData.team_name,
        manager_code: rosterData.manager_code,
        formation: rosterData.formation,
        total_points: rosterData.total_points,
      });
      setAuthError(null);
    } catch (err) {
      console.warn("Failed to fetch team data for pin:", pin, err.message);
      setAuthError(err.message);
      // Don't wipe immediately if network error, but if 401:
      if (err.message.includes("401") || err.message.includes("not found")) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (managerCode) {
      fetchTeamData(managerCode);
    } else {
      setIsLoading(false);
    }
  }, [managerCode]);

  const login = async (pin) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const resp = await api.loginTeam(pin);
      localStorage.setItem("beanleague_pin", resp.manager_code);
      localStorage.setItem("beanleague_season", resp.season_code);
      setManagerCode(resp.manager_code);
      setSeasonCode(resp.season_code);
      await fetchTeamData(resp.manager_code);
      return resp;
    } catch (err) {
      setAuthError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  const joinLeague = async (code, teamName, formation = "4-3-3", recoveryPlayer1Id = null, recoveryPlayer2Id = null, recoveryPlayer3Id = null, secretWord = "") => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const resp = await api.createTeam(code, teamName, formation, recoveryPlayer1Id, recoveryPlayer2Id, recoveryPlayer3Id, secretWord);
      localStorage.setItem("beanleague_pin", resp.manager_code);
      localStorage.setItem("beanleague_season", resp.season_code);
      setManagerCode(resp.manager_code);
      setSeasonCode(resp.season_code);
      await fetchTeamData(resp.manager_code);
      return resp;
    } catch (err) {
      setAuthError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  const createNewSeasonAndTeam = async (seasonCode, seasonName, salaryCap = 100.0, teamName, formation = "4-3-3") => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // 1. Create the league
      await api.createLeague(seasonCode.trim().toUpperCase(), seasonName.trim(), salaryCap);
      // 2. Create the founding team
      const resp = await api.createTeam(seasonCode.trim().toUpperCase(), teamName.trim(), formation);
      localStorage.setItem("beanleague_pin", resp.manager_code);
      localStorage.setItem("beanleague_season", resp.season_code);
      setManagerCode(resp.manager_code);
      setSeasonCode(resp.season_code);
      await fetchTeamData(resp.manager_code);
      return resp;
    } catch (err) {
      setAuthError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  const recoverTeam = async (seasonCode, p1Id, p2Id, p3Id, word) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const resp = await api.recoverTeam(seasonCode, p1Id, p2Id, p3Id, word);
      return resp;
    } catch (err) {
      setAuthError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("beanleague_pin");
    setManagerCode("");
    setTeam(null);
    setRoster(null);
  };

  const refreshRoster = async () => {
    if (managerCode) {
      await fetchTeamData(managerCode);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        managerCode,
        seasonCode,
        team,
        roster,
        isLoading,
        authError,
        login,
        joinLeague,
        createNewSeasonAndTeam,
        recoverTeam,
        logout,
        refreshRoster,
        setSeasonCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
