import type { Step } from './types'

export const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const formatFee = (step: Step) => (step.feeInr === 0 ? 'Free' : inr.format(step.feeInr))

export function formatDays({ processingDays: { min, max } }: Step) {
  if (max === 0) return 'Same day'
  return min === max ? `${max} day${max === 1 ? '' : 's'}` : `${min}–${max} days`
}
