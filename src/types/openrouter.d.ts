export interface Pricing {
  prompt: string
  completion: string
}

export interface Model {
  id: string
  name: string
  context_length: number
  pricing: Pricing
  description?: string
  created?: number  // Unix timestamp from OpenRouter API
  architecture?: {
    modality?: string
    tokenizer?: string
  }
}

export interface ModelChange {
  type: 'new' | 'price' | 'removed'
  model: string
  modelId?: string
  detail?: string
  timestamp: string
}

export interface ModelSnapshot {
  [id: string]: {
    price: string
    ctx: number
  }
}

export type ModelStatus = 'new' | 'changed' | 'stable' | 'removed'

export interface ModelWithStatus extends Model {
  status: ModelStatus
}

export interface Recommendation {
  rank: number
  name: string
  id: string
  reason: string
  quality: number
  speed: number
  cost: number
}

export interface Priorities {
  quality: number
  speed: number
  cost: number
}

export interface WatchRule {
  modelId: string
  useCase: string
  priorities: Priorities
  priceThreshold?: number  // $/M tokens — alert if price exceeds this
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
