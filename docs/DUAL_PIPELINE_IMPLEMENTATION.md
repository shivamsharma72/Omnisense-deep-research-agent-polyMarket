# Dual Pipeline Implementation Guide

## 🎯 Overview

This document describes how to implement a dual-pipeline system allowing users to choose between:
- **⚡ Fast Mode** (Current - 2-3 minutes): Optimized, parallel research, no critic
- **🔬 Comprehensive Mode** (Old - 5-6 minutes): Full analysis with critic and follow-up research

## 📊 Pipeline Comparison

| Feature | Fast Mode | Comprehensive Mode |
|---------|-----------|-------------------|
| **Research** | Parallel (Promise.all) | Sequential |
| **Critic Analysis** | ❌ Skipped | ✅ Included |
| **Follow-up Research** | ❌ Skipped | ✅ Included |
| **Time** | 2-3 minutes | 5-6 minutes |
| **Depth** | Good | Excellent |
| **Use Case** | Quick decisions | Deep research |

## 🏗️ Implementation Steps

### Step 1: Organize Agent Files

```
src/lib/agents/
├── fast/                          # Current optimized agents
│   ├── orchestrator.ts           # Fast pipeline (current)
│   ├── analyst.ts
│   ├── researcher.ts
│   └── ... (other agents)
│
├── comprehensive/                 # Old comprehensive agents
│   ├── orchestrator.ts           # Full pipeline with critic
│   ├── analyst.ts
│   ├── researcher.ts
│   ├── critic.ts                 # Only in comprehensive
│   └── ... (other agents)
│
└── index.ts                       # Pipeline router
```

### Step 2: Create Pipeline Router

**File: `src/lib/agents/index.ts`**

```typescript
import { ForecastCard } from '../forecasting/types';

export type AnalysisMode = 'fast' | 'comprehensive';

export interface AnalysisOptions {
  marketUrl: string;
  mode?: AnalysisMode;
  sessionId?: string;
  customerId?: string;
  onProgress?: (step: string, details: any) => void;
  // ... other options
}

export async function runAnalysis(opts: AnalysisOptions): Promise<ForecastCard> {
  const mode = opts.mode || 'fast'; // Default to fast
  
  if (mode === 'comprehensive') {
    const { runUnifiedForecastPipeline } = await import('./comprehensive/orchestrator');
    return runUnifiedForecastPipeline(opts);
  } else {
    const { runUnifiedForecastPipeline } = await import('./fast/orchestrator');
    return runUnifiedForecastPipeline(opts);
  }
}
```

### Step 3: Update API Route

**File: `src/app/api/forecast/route.ts`**

```typescript
import { runAnalysis, AnalysisMode } from '@/lib/agents';

export async function POST(request: Request) {
  const body = await request.json();
  const { marketUrl, analysisMode = 'fast' } = body; // Get mode from request
  
  // ... validation ...
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const forecast = await runAnalysis({
          marketUrl,
          mode: analysisMode as AnalysisMode,
          sessionId,
          onProgress: (step, details) => {
            const data = `data: ${JSON.stringify({
              type: 'progress',
              step,
              ...details,
            })}\n\n`;
            controller.enqueue(encoder.encode(data));
          },
        });
        
        // Send complete event
        const completeData = `data: ${JSON.stringify({
          type: 'complete',
          forecast,
        })}\n\n`;
        controller.enqueue(encoder.encode(completeData));
        controller.close();
      } catch (error) {
        // Error handling...
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Step 4: Add Frontend Toggle

**File: `src/app/page.tsx` (or analysis page)**

```typescript
'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'comprehensive'>('fast');
  
  const handleAnalysis = async (url: string) => {
    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketUrl: url,
        analysisMode, // Send selected mode
      }),
    });
    
    // Handle streaming response...
  };
  
  return (
    <div>
      {/* Mode Selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Switch
            id="analysis-mode"
            checked={analysisMode === 'comprehensive'}
            onCheckedChange={(checked) => 
              setAnalysisMode(checked ? 'comprehensive' : 'fast')
            }
          />
          <Label htmlFor="analysis-mode" className="cursor-pointer">
            {analysisMode === 'fast' ? (
              <>
                <span className="font-semibold">⚡ Fast Mode</span>
                <Badge variant="secondary" className="ml-2">2-3 min</Badge>
              </>
            ) : (
              <>
                <span className="font-semibold">🔬 Comprehensive Mode</span>
                <Badge variant="secondary" className="ml-2">5-6 min</Badge>
              </>
            )}
          </Label>
        </div>
        
        {/* Mode Description */}
        <div className="text-sm text-muted-foreground">
          {analysisMode === 'fast' 
            ? 'Quick analysis with parallel research' 
            : 'Deep analysis with critic review and follow-up research'}
        </div>
      </div>
      
      {/* ... rest of UI ... */}
    </div>
  );
}
```

### Step 5: Update Analysis Page State

**File: `src/app/analysis/page.tsx`**

```typescript
// Add mode to search params
const analysisMode = searchParams.get('mode') || 'fast';

// Pass mode to API call
const response = await fetch(`/api/forecast`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    marketUrl: url,
    analysisMode,
  }),
});
```

## 🔄 Migration Steps

### 1. Copy Old Agents

```bash
# Create comprehensive folder
mkdir -p src/lib/agents/comprehensive

# Copy old agents
cp agents_old/* src/lib/agents/comprehensive/
```

### 2. Rename Current Agents

```bash
# Create fast folder
mkdir -p src/lib/agents/fast

# Move current agents
mv src/lib/agents/*.ts src/lib/agents/fast/
```

### 3. Update Imports

All imports need to be updated:

**Before:**
```typescript
import { runUnifiedForecastPipeline } from '@/lib/agents/orchestrator';
```

**After:**
```typescript
import { runAnalysis } from '@/lib/agents';
```

## ⚠️ Important Notes

### Is it a Drop-in Replacement?

**Not quite** - You'll need to:

1. ✅ **Imports**: Update import paths
2. ✅ **Types**: Both orchestrators should have same interface
3. ✅ **Progress Events**: Comprehensive mode has extra steps (critic, follow-up)
4. ⚠️ **Step Names**: Different step identifiers between modes

### Compatibility Checklist

- [ ] Both orchestrators export `runUnifiedForecastPipeline`
- [ ] Both accept same `UnifiedOrchestratorOpts` interface
- [ ] Both return `ForecastCard` type
- [ ] Progress events use consistent format
- [ ] Error handling is identical

### Additional Step Identifiers (Comprehensive Mode)

```typescript
const COMPREHENSIVE_STEPS = {
  ...FAST_MODE_STEPS,
  'criticism': {
    name: 'Critic Analysis',
    description: 'Identifying gaps and concerns',
  },
  'followup_research': {
    name: 'Follow-up Research',
    description: 'Addressing identified gaps',
  },
};
```

## 🎨 UI/UX Recommendations

### Mode Selector Design

```tsx
<div className="border rounded-lg p-4 bg-card">
  <h3 className="font-semibold mb-4">Analysis Depth</h3>
  
  <div className="grid grid-cols-2 gap-4">
    {/* Fast Mode */}
    <button
      onClick={() => setMode('fast')}
      className={`p-4 border-2 rounded-lg ${
        mode === 'fast' 
          ? 'border-primary bg-primary/5' 
          : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">⚡</span>
        <span className="font-semibold">Fast</span>
        <Badge variant="secondary">2-3 min</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Quick analysis with parallel research
      </p>
      <ul className="mt-2 text-xs text-muted-foreground">
        <li>• Parallel evidence gathering</li>
        <li>• Optimized for speed</li>
        <li>• Good for time-sensitive decisions</li>
      </ul>
    </button>
    
    {/* Comprehensive Mode */}
    <button
      onClick={() => setMode('comprehensive')}
      className={`p-4 border-2 rounded-lg ${
        mode === 'comprehensive' 
          ? 'border-primary bg-primary/5' 
          : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔬</span>
        <span className="font-semibold">Comprehensive</span>
        <Badge variant="secondary">5-6 min</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Deep analysis with critic review
      </p>
      <ul className="mt-2 text-xs text-muted-foreground">
        <li>• Sequential evidence gathering</li>
        <li>• Critic analysis included</li>
        <li>• Follow-up research</li>
        <li>• Maximum depth and rigor</li>
      </ul>
    </button>
  </div>
</div>
```

### Progress Indicator

Show different progress bars based on mode:

```tsx
{mode === 'fast' ? (
  <Progress value={fastProgress} max={100} label="⚡ Fast Analysis" />
) : (
  <Progress value={comprehensiveProgress} max={100} label="🔬 Comprehensive Analysis" />
)}
```

## 🧪 Testing

### Test Cases

1. **Fast Mode**
   - ✅ Analysis completes in 2-3 minutes
   - ✅ No critic step in progress
   - ✅ No follow-up research step
   - ✅ Result quality is good

2. **Comprehensive Mode**
   - ✅ Analysis completes in 5-6 minutes
   - ✅ Critic step is executed
   - ✅ Follow-up research is executed
   - ✅ Result quality is excellent

3. **Mode Switching**
   - ✅ Can switch modes before analysis
   - ✅ Cannot switch during analysis
   - ✅ Mode persists in URL params

## 📝 Summary

**Pros of Dual Pipeline:**
- ✅ User choice between speed and depth
- ✅ Preserve both code paths
- ✅ Clear trade-offs communicated
- ✅ Future flexibility

**Cons:**
- ⚠️ Maintenance overhead (2 pipelines)
- ⚠️ More code to test
- ⚠️ Potential confusion for users

**Recommendation:** 
Implement dual pipeline with Fast Mode as default, Comprehensive Mode as optional for power users.

