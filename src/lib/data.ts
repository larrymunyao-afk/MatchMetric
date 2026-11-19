import { supabase, isSupabaseConfigured } from "./supabase";
import type { Prediction } from "../types";

export const demoPredictions: Prediction[] = [
  { id: "demo-1", home_team: "Arsenal", away_team: "Brentford", competition: "Premier League", country: "England", kickoff_at: new Date(Date.now()+86400000).toISOString(), market: "Goals", selection: "Over 1.5 Goals", odds: 1.28, confidence: 78, analysis: "Demonstration entry: replace with a researched prediction before publishing.", status: "pending", home_score: null, away_score: null, published_at: new Date().toISOString() },
  { id: "demo-2", home_team: "Real Madrid", away_team: "Getafe", competition: "La Liga", country: "Spain", kickoff_at: new Date(Date.now()+93600000).toISOString(), market: "Double Chance", selection: "1X", odds: 1.19, confidence: 81, analysis: "Demonstration entry: replace with a researched prediction before publishing.", status: "pending", home_score: null, away_score: null, published_at: new Date().toISOString() },
  { id: "demo-3", home_team: "Inter", away_team: "Torino", competition: "Serie A", country: "Italy", kickoff_at: new Date(Date.now()+108000000).toISOString(), market: "Goals", selection: "Both Teams To Score — No", odds: 1.72, confidence: 66, analysis: "Demonstration entry: replace with a researched prediction before publishing.", status: "pending", home_score: null, away_score: null, published_at: new Date().toISOString() },
  { id: "demo-4", home_team: "Dortmund", away_team: "Mainz", competition: "Bundesliga", country: "Germany", kickoff_at: new Date(Date.now()-86400000).toISOString(), market: "Goals", selection: "Over 2.5 Goals", odds: 1.65, confidence: 70, analysis: "Demo history only. This is not a real published prediction.", status: "won", home_score: 3, away_score: 1, published_at: new Date(Date.now()-172800000).toISOString(), settled_at: new Date().toISOString() },
  { id: "demo-5", home_team: "Lyon", away_team: "Nice", competition: "Ligue 1", country: "France", kickoff_at: new Date(Date.now()-172800000).toISOString(), market: "Double Chance", selection: "X2", odds: 1.55, confidence: 64, analysis: "Demo history only. This is not a real published prediction.", status: "lost", home_score: 2, away_score: 0, published_at: new Date(Date.now()-259200000).toISOString(), settled_at: new Date().toISOString() }
];

export async function getPredictions(): Promise<Prediction[]> {
  if (!isSupabaseConfigured || !supabase) return demoPredictions;
  const { data, error } = await supabase.from("predictions").select("*").eq("is_published", true).order("kickoff_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Prediction[];
}
