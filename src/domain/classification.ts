/**
 * Pure classification domain logic.
 * No I/O — all data is passed in from the service layer.
 */

export interface ClassifierRuleInput {
  id: string
  classId: string
  regex: string
  value: string | null
  valueMin: string | null
  valueMax: string | null
  date: string | null
}

export interface TransactionInput {
  id: string
  date: string  // YYYY-MM-DD
  description: string
  amount: string // Decimal as string
}

export interface ClassificationResult {
  transactionId: string
  classId: string
}

/**
 * Tests a single classifier rule against a transaction.
 * description is expected to be already uppercased.
 */
export function testRule(
  rule: ClassifierRuleInput,
  upperDescription: string,
  amount: number,
  date: string,
): boolean {
  const re = new RegExp(rule.regex, 'i')
  if (!re.test(upperDescription)) return false

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

/**
 * Classifies a single transaction using two-pass matching.
 * Pass 1: constrained rules (value / date constraints)
 * Pass 2: regex-only rules
 * Pass 3: fallback to Undefined Debit / Undefined Credit
 */
export function classifyTransaction(
  transaction: TransactionInput,
  constrainedRules: ClassifierRuleInput[],
  regexOnlyRules: ClassifierRuleInput[],
  undefinedDebitClassId: string,
  undefinedCreditClassId: string,
): string {
  const upperDesc = transaction.description.toUpperCase()
  const amount = parseFloat(transaction.amount)

  for (const rule of constrainedRules) {
    if (testRule(rule, upperDesc, amount, transaction.date)) {
      return rule.classId
    }
  }

  for (const rule of regexOnlyRules) {
    if (testRule(rule, upperDesc, amount, transaction.date)) {
      return rule.classId
    }
  }

  return amount < 0 ? undefinedDebitClassId : undefinedCreditClassId
}

/**
 * Partitions rules into constrained and regex-only sets.
 */
export function partitionRules(rules: ClassifierRuleInput[]): {
  constrained: ClassifierRuleInput[]
  regexOnly: ClassifierRuleInput[]
} {
  const constrained: ClassifierRuleInput[] = []
  const regexOnly: ClassifierRuleInput[] = []

  for (const rule of rules) {
    if (rule.value !== null || rule.valueMin !== null || rule.valueMax !== null || rule.date !== null) {
      constrained.push(rule)
    } else {
      regexOnly.push(rule)
    }
  }

  return { constrained, regexOnly }
}
