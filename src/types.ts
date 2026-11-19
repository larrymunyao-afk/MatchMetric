export type Market = "Goals" | "Double Chance" | "1X2" | "Other";
export type PredictionStatus = "pending" | "won" | "lost" | "void";
export interface Prediction {
  id: string;
  home_team: string;
  away_team: string;
  competition: string;
  country?: string | null;
  kickoff_at: string;
  market: Market;
  selection: string;
  odds: number;
  confidence: number | null;
  analysis: string | null;
  status: PredictionStatus;
  home_score: number | null;
  away_score: number | null;
  published_at: string | null;
  settled_at?: string | null;
}
export interface Accumulator {
  id: string;
  title: string;
  risk_label: string;
  published_at: string | null;
  status: PredictionStatus;
  selections?: { prediction: Prediction }[];
}
