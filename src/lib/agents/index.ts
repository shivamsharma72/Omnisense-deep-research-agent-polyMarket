import { ForecastCard } from '../forecasting/types';

export type AnalysisMode = 'fast' | 'comprehensive';

export interface AnalysisOptions {
  marketUrl: string;
  mode?: AnalysisMode;
  sessionId?: string;
  customerId?: string;
  onProgress?: (step: string, details: any) => void;
  rhoByCluster?: Record<string, number>;
  drivers?: string[];
  historyInterval?: string;
  withBooks?: boolean;
  withTrades?: boolean;
}

/**
 * Main entry point for market analysis
 * Routes to either fast or comprehensive pipeline based on mode
 * 
 * Fast Mode (2-3 minutes):
 * - Parallel research
 * - No critic analysis
 * - No follow-up research
 * - Optimized for speed
 * 
 * Comprehensive Mode (5-6 minutes):
 * - Sequential/parallel research
 * - Includes critic analysis
 * - Includes follow-up research
 * - Thorough analysis with gap-filling
 */
export async function runAnalysis(opts: AnalysisOptions): Promise<ForecastCard> {
  const mode = opts.mode || 'fast'; // Default to fast
  
  console.log(`🚀 Running ${mode.toUpperCase()} analysis pipeline...`);
  
  if (mode === 'comprehensive') {
    // Import and run comprehensive pipeline (5-6 minutes)
    // This includes critic analysis and follow-up research for thoroughness
    const { runUnifiedForecastPipeline } = await import('./comprehensive/orchestrator');
    return runUnifiedForecastPipeline({
      marketUrl: opts.marketUrl,
      sessionId: opts.sessionId,
      customerId: opts.customerId,
      onProgress: opts.onProgress,
      rhoByCluster: opts.rhoByCluster,
      drivers: opts.drivers,
      historyInterval: opts.historyInterval,
      withBooks: opts.withBooks,
      withTrades: opts.withTrades,
    });
  } else {
    // Import and run fast pipeline (2-3 minutes)
    // This is optimized for speed with parallel research and skipped critic steps
    const { runUnifiedForecastPipeline } = await import('./orchestrator');
    return runUnifiedForecastPipeline({
      marketUrl: opts.marketUrl,
      sessionId: opts.sessionId,
      customerId: opts.customerId,
      onProgress: opts.onProgress,
      rhoByCluster: opts.rhoByCluster,
      drivers: opts.drivers,
      historyInterval: opts.historyInterval,
      withBooks: opts.withBooks,
      withTrades: opts.withTrades,
    });
  }
}

// Re-export for backwards compatibility
export { runAnalysis as runUnifiedForecastPipeline };

// Re-export types
export type { AnalysisMode, AnalysisOptions };

