import { describe, expect, test } from 'vitest'
import { formatDateRange, formatMonth, parseDate, isValidDate } from '../format.js'

describe('formatMonth', () => {
  test.each([
    ['2025-06', 'Jun 2025'],
    ['2025-01', 'Jan 2025'],
    ['2025-12', 'Dec 2025'],
    ['2025', '2025'],
    ['TODO', 'TODO'],
    [null, null],
  ])('%s -> %s', (input, out) => expect(formatMonth(input)).toBe(out))
})

describe('formatDateRange (spec 7.2 cases)', () => {
  test('open-ended', () => expect(formatDateRange('2025-06', null)).toBe('Jun 2025 – Present'))
  test('closed', () => expect(formatDateRange('2025-06', '2025-09')).toBe('Jun 2025 – Sep 2025'))
  test('same month', () => expect(formatDateRange('2025-06', '2025-06')).toBe('Jun 2025'))
  test('expected', () => expect(formatDateRange('2023-09', '2027-06', { expected: true })).toBe('Sep 2023 – Expected Jun 2027'))
  test('both null', () => expect(formatDateRange(null, null)).toBeNull())
  test('placeholders', () => expect(formatDateRange('TODO', 'TODO')).toBe('TODO – TODO'))
  test('year only', () => expect(formatDateRange('2020', '2024')).toBe('2020 – 2024'))
  test('no start, expected end', () => expect(formatDateRange(null, '2028-06', { expected: true })).toBe('Expected Jun 2028'))
  test('uses an en dash with spaces', () => expect(formatDateRange('2020', null)).toContain(' – '))
})

describe('parseDate / isValidDate', () => {
  test('valid', () => {
    expect(parseDate('2024-02')).toEqual({ year: 2024, month: 2 })
    expect(parseDate('2024')).toEqual({ year: 2024, month: null })
  })
  test.each(['2024-13', '2024-1', '24-01', 'June 2024', 'TODO', '', null])('invalid %s', (v) => expect(isValidDate(v)).toBe(false))
})
