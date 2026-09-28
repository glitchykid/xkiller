export interface Candle {
  time: number;
  end: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  minutes: number;
}
export interface Frame {
  frame: string;
  price: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: number;
  atr: number;
  bandUpper: number;
  bandLower: number;
  trend: string;
}
export interface TrainingOptions {
  epochs: number;
  learningRate: number;
  horizon: number;
  labelThreshold: number;
}
export interface RiskOptions {
  initialBalance: number;
  leverage: number;
  riskPercent: number;
  stopAtr: number;
  rewardRisk: number;
  confidence: number;
  feeBps: number;
  slippageBps: number;
  maxDrawdownPercent: number;
  maxHoldBars: number;
  maintenancePercent: number;
}
export interface Metrics {
  accuracy: number;
  baselineAccuracy: number;
  logLoss: number;
  samples: number;
  confusion: number[][];
}
export interface Model {
  id: string;
  dataId: string;
  createdAt: string;
  options: TrainingOptions;
  mean: number[];
  scale: number[];
  weights: number[][];
  trainEnd: number;
  validationEnd: number;
  testStart: number;
  testStartTime: number;
  validation: Metrics;
  test: Metrics;
  bestEpoch: number;
  loss: { epoch: number; train: number; validation: number }[];
}
export interface Trade {
  entryTime: number;
  exitTime: number;
  side: string;
  entry: number;
  exit: number;
  quantity: number;
  pnl: number;
  fees: number;
  funding: number;
  reason: string;
}
export interface Result {
  id: string;
  modelId: string;
  dataId: string;
  createdAt: string;
  options: RiskOptions;
  finalBalance: number;
  returnPercent: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number | null;
  totalFees: number;
  totalFunding: number;
  halted: boolean;
  count: number;
  trades: Trade[];
  equity: { time: number; equity: number }[];
}
export interface State {
  data: {
    id: string;
    source: string;
    importedAt: string;
    count: number;
    start: number;
    end: number;
    fundingCount: number;
    synthetic: boolean;
  };
  charts: Record<string, Candle[]>;
  frames: Frame[];
  model: Model | null;
  prediction: number[] | null;
  features: string[];
  risk: RiskOptions;
  job: {
    id: string;
    kind: string;
    status: string;
    progress: number;
    message: string;
    error: string | null;
  } | null;
  runs: {
    id: string;
    modelId: string;
    createdAt: string;
    returnPercent: number;
    maxDrawdownPercent: number;
    count: number;
    finalBalance: number;
    halted: boolean;
  }[];
  result: Result | null;
}
declare global {
  interface Window {
    xkiller?: {
      request: (action: string, payload?: unknown) => Promise<unknown>;
      export: (kind: string) => Promise<boolean>;
    };
  }
}
