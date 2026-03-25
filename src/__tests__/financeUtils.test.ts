import { describe, it, expect } from 'vitest'
import { parseAmount, detectCategory, detectColumns } from '../lib/financeUtils'

// ─── parseAmount ──────────────────────────────────────────────────────────────

describe('parseAmount', () => {
  it('parses standard dot decimal', () => {
    expect(parseAmount('12.50')).toBeCloseTo(12.5)
  })

  it('parses French comma decimal separator', () => {
    expect(parseAmount('12,50')).toBeCloseTo(12.5)
  })

  it('strips whitespace', () => {
    expect(parseAmount('  -45.00  ')).toBeCloseTo(-45)
  })

  it('strips euro sign', () => {
    expect(parseAmount('19,99 €')).toBeCloseTo(19.99)
  })

  it('handles negative amounts', () => {
    expect(parseAmount('-1 234,56')).toBeCloseTo(-1234.56)
  })

  it('returns 0 for non-numeric input', () => {
    expect(parseAmount('N/A')).toBe(0)
    expect(parseAmount('')).toBe(0)
  })

  it('handles non-string input gracefully', () => {
    expect(parseAmount(42 as unknown as string)).toBeCloseTo(42)
  })
})

// ─── detectCategory ───────────────────────────────────────────────────────────

describe('detectCategory', () => {
  it('detects food', () => {
    expect(detectCategory('CARREFOUR SUPERMARCHÉ')).toBe('food')
    expect(detectCategory('RESTAURANT LE BISTROT')).toBe('food')
    expect(detectCategory('Uber Eats paiement')).toBe('food')
  })

  it('detects transport', () => {
    expect(detectCategory('SNCF BILLET TGV')).toBe('transport')
    expect(detectCategory('RATP navigo rechargement')).toBe('transport')
    expect(detectCategory('Uber course Paris')).toBe('transport')
  })

  it('detects housing/utilities', () => {
    expect(detectCategory('Loyer appartement mensuel')).toBe('housing')
    expect(detectCategory('EDF facture électricité')).toBe('housing')
  })

  it('detects entertainment', () => {
    expect(detectCategory('NETFLIX abonnement mensuel')).toBe('entertainment')
    expect(detectCategory('Spotify Premium')).toBe('entertainment')
  })

  it('detects income', () => {
    expect(detectCategory('Virement reçu salaire')).toBe('income')
    expect(detectCategory('Allocation CAF versement')).toBe('income')
  })

  it('falls back to other for unknown', () => {
    expect(detectCategory('XYZQWERTYUIOP')).toBe('other')
    expect(detectCategory('')).toBe('other')
  })

  it('is case-insensitive', () => {
    expect(detectCategory('carrefour')).toBe('food')
    expect(detectCategory('NETFLIX')).toBe('entertainment')
  })
})

// ─── detectColumns ────────────────────────────────────────────────────────────

describe('detectColumns', () => {
  it('detects standard French bank headers', () => {
    const cols = ['Date opération', 'Libellé', 'Montant']
    const result = detectColumns(cols)
    expect(result).not.toBeNull()
    expect(result!.date).toBe(0)
    expect(result!.description).toBe(1)
    expect(result!.amount).toBe(2)
  })

  it('detects split debit/credit columns', () => {
    const cols = ['Date', 'Libellé', 'Débit', 'Crédit']
    const result = detectColumns(cols)
    expect(result).not.toBeNull()
    expect(result!.debit).toBe(2)
    expect(result!.credit).toBe(3)
  })

  it('returns null when date column is missing', () => {
    expect(detectColumns(['Libellé', 'Montant'])).toBeNull()
  })

  it('returns null when description column is missing', () => {
    expect(detectColumns(['Date', 'Montant'])).toBeNull()
  })

  it('handles English headers', () => {
    const cols = ['Date', 'Description', 'Amount']
    const result = detectColumns(cols)
    expect(result).not.toBeNull()
    expect(result!.date).toBe(0)
    expect(result!.description).toBe(1)
  })

  it('handles extra unknown columns gracefully', () => {
    const cols = ['Account', 'Date valeur', 'Label', 'Solde', 'Balance']
    const result = detectColumns(cols)
    expect(result).not.toBeNull()
  })
})
