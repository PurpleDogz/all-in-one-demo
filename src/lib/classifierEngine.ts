import { LRUCache } from 'lru-cache'

export interface ClassifierRuleData {
  id: string
  classId: string
  regex: string
  value: string | null
  valueMin: string | null
  valueMax: string | null
  date: string | null
}

export interface ClassMatchResult {
  classId: string
  ruleId: string
}

// lru-cache v10 requires non-null value types; wrap the nullable result
type CacheEntry = { result: ClassMatchResult | null }

/**
 * Builds an LRU-cached classification engine for a reclassify run.
 * Pure function — no I/O. Receives rules from the service layer.
 */
export function buildClassifierEngine(rules: ClassifierRuleData[], capacity = 200) {
  const cache = new LRUCache<string, CacheEntry>({ max: capacity })

  const constrainedRules = rules.filter(
    (r) => r.value !== null || r.valueMin !== null || r.valueMax !== null || r.date !== null,
  )
  const regexOnlyRules = rules.filter(
    (r) => r.value === null && r.valueMin === null && r.valueMax === null && r.date === null,
  )

  function testRule(rule: ClassifierRuleData, description: string, amount: number, date: string): boolean {
    const re = new RegExp(rule.regex, 'i')
    if (!re.test(description)) return false

    if (rule.value !== null) {
      const target = Math.round(parseFloat(rule.value) * 100)
      const actual = Math.round(Math.abs(amount) * 100)
      if (target !== actual) return false
    }

    if (rule.valueMin !== null || rule.valueMax !== null) {
      const abs = Math.abs(amount)
      if (rule.valueMin !== null && abs < parseFloat(rule.valueMin)) return false
      if (rule.valueMax !== null && abs > parseFloat(rule.valueMax)) return false
    }

    if (rule.date !== null && rule.date !== date) return false

    return true
  }

  function classify(
    description: string,
    amount: number,
    date: string,
    undefinedDebitClassId: string,
    undefinedCreditClassId: string,
  ): ClassMatchResult {
    const upperDesc = description.toUpperCase()
    const cacheKey = `${upperDesc}::${amount}::${date}`

    const cached = cache.get(cacheKey)
    if (cached !== undefined) {
      return cached.result ?? { classId: amount < 0 ? undefinedDebitClassId : undefinedCreditClassId, ruleId: '' }
    }

    // Pass 1: constrained rules
    for (const rule of constrainedRules) {
      if (testRule(rule, upperDesc, amount, date)) {
        const result: ClassMatchResult = { classId: rule.classId, ruleId: rule.id }
        cache.set(cacheKey, { result })
        return result
      }
    }

    // Pass 2: regex-only rules
    for (const rule of regexOnlyRules) {
      if (testRule(rule, upperDesc, amount, date)) {
        const result: ClassMatchResult = { classId: rule.classId, ruleId: rule.id }
        cache.set(cacheKey, { result })
        return result
      }
    }

    // Pass 3: fallback
    cache.set(cacheKey, { result: null })
    const fallbackClassId = amount < 0 ? undefinedDebitClassId : undefinedCreditClassId
    return { classId: fallbackClassId, ruleId: '' }
  }

  return { classify }
}
