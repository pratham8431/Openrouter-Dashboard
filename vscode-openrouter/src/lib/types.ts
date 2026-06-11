export interface Pricing {
  prompt: string
  completion: string
}

export interface Model {
  id: string
  name: string
  context_length: number
  pricing: Pricing
  created?: number
  description?: string
}

export type ModelStatus = 'new' | 'changed' | 'stable' | 'removed'

export interface WatchRule {
  modelId: string
  useCase: string
  priorities: { quality: number; speed: number; cost: number }
  priceThreshold?: number
  triggerOnRemoval: boolean
}

export interface FallbackResult {
  modelId: string
  modelName: string
  reason: string
  quality: number
  speed: number
  cost: number
  monthlyEstimate?: number
}

export interface ModelSnapshot {
  [modelId: string]: { price: string; ctx: number }
}
