import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBills } from './bills'
import type { Bill } from './bills'

const BASE_URL = 'https://firefly.example.com'
const TOKEN = 'test-token'

function mockPaginatedResponse(data: unknown[], totalPages = 1) {
  return {
    data,
    meta: {
      pagination: {
        total: data.length,
        count: data.length,
        per_page: 50,
        current_page: 1,
        total_pages: totalPages,
      },
    },
  }
}

function mockFetchOk(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(body),
    })
  )
}

function mockFetchError(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: 'Error',
      json: () => Promise.resolve({}),
    })
  )
}

const baseBillRaw = {
  id: '1',
  attributes: {
    name: 'Netflix',
    active: true,
    currency_code: 'EUR',
    currency_symbol: '€',
    currency_decimal_places: 2,
    amount_min: '12.99',
    amount_max: '12.99',
    amount_avg: '12.99',
    pay_dates: ['2026-04-15', '2026-05-15'],
    paid_dates: [{ date: '2026-03-15', transaction_journal_id: '101', transaction_group_id: '42' }],
    pc_amount_min: '14.00',
    pc_amount_max: '14.50',
    pc_amount_avg: '14.23',
  },
}

describe('fetchBills', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls /bills endpoint with start and end params', async () => {
    mockFetchOk(mockPaginatedResponse([]))
    await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/api/v1/bills')
    expect(url).toContain('start=2026-04-12')
    expect(url).toContain('end=2026-04-30')
  })

  it('includes Authorization header', async () => {
    mockFetchOk(mockPaginatedResponse([]))
    await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${TOKEN}`
    )
  })

  it('maps raw bill to Bill shape — all fields', async () => {
    mockFetchOk(mockPaginatedResponse([baseBillRaw]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result).toHaveLength(1)
    const bill: Bill = result[0]
    expect(bill.id).toBe('1')
    expect(bill.name).toBe('Netflix')
    expect(bill.active).toBe(true)
    expect(bill.currencyCode).toBe('EUR')
    expect(bill.currencySymbol).toBe('€')
    expect(bill.currencyDecimalPlaces).toBe(2)
    expect(bill.amountMin).toBe(12.99)
    expect(bill.amountMax).toBe(12.99)
    expect(bill.amountAvg).toBe(12.99)
    expect(bill.pcAmountMin).toBe(14.00)
    expect(bill.pcAmountMax).toBe(14.50)
    expect(bill.pcAmountAvg).toBe(14.23)
    expect(bill.payDates).toEqual(['2026-04-15', '2026-05-15'])
    expect(bill.paidDates).toEqual([
      { date: '2026-03-15', transactionJournalId: '101', transactionGroupId: '42' },
    ])
  })

  it('maps pc_amount_* null to null (not NaN)', async () => {
    const billWithNullPc = {
      ...baseBillRaw,
      attributes: {
        ...baseBillRaw.attributes,
        pc_amount_min: null,
        pc_amount_max: null,
        pc_amount_avg: null,
      },
    }
    mockFetchOk(mockPaginatedResponse([billWithNullPc]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].pcAmountMin).toBeNull()
    expect(result[0].pcAmountMax).toBeNull()
    expect(result[0].pcAmountAvg).toBeNull()
  })

  it('parses amount_avg string to number', async () => {
    mockFetchOk(mockPaginatedResponse([baseBillRaw]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].amountAvg).toBe(12.99)
    expect(typeof result[0].amountAvg).toBe('number')
  })

  it('maps unparseable required amount to 0', async () => {
    const billWithBadAmount = {
      ...baseBillRaw,
      attributes: { ...baseBillRaw.attributes, amount_avg: 'invalid', amount_min: 'bad', amount_max: 'NaN' },
    }
    mockFetchOk(mockPaginatedResponse([billWithBadAmount]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].amountAvg).toBe(0)
    expect(result[0].amountMin).toBe(0)
    expect(result[0].amountMax).toBe(0)
  })

  it('maps unparseable pc amount to null', async () => {
    const billWithBadPc = {
      ...baseBillRaw,
      attributes: { ...baseBillRaw.attributes, pc_amount_avg: 'invalid' },
    }
    mockFetchOk(mockPaginatedResponse([billWithBadPc]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].pcAmountAvg).toBeNull()
  })

  it('handles bill with no pay_dates', async () => {
    const billNoDates = {
      ...baseBillRaw,
      attributes: { ...baseBillRaw.attributes, pay_dates: [], paid_dates: [] },
    }
    mockFetchOk(mockPaginatedResponse([billNoDates]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].payDates).toEqual([])
    expect(result[0].paidDates).toEqual([])
  })

  it('maps paidDates with full transaction IDs', async () => {
    const billWithMultiplePaidDates = {
      ...baseBillRaw,
      attributes: {
        ...baseBillRaw.attributes,
        paid_dates: [
          { date: '2026-03-15', transaction_journal_id: '101', transaction_group_id: '42' },
          { date: '2026-02-14', transaction_journal_id: '88', transaction_group_id: '30' },
        ],
      },
    }
    mockFetchOk(mockPaginatedResponse([billWithMultiplePaidDates]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].paidDates).toHaveLength(2)
    expect(result[0].paidDates[1]).toEqual({
      date: '2026-02-14',
      transactionJournalId: '88',
      transactionGroupId: '30',
    })
  })

  it('handles inactive bills (returned as-is, filtering is caller responsibility)', async () => {
    const inactiveBill = {
      ...baseBillRaw,
      id: '2',
      attributes: { ...baseBillRaw.attributes, name: 'Cancelled', active: false },
    }
    mockFetchOk(mockPaginatedResponse([baseBillRaw, inactiveBill]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result).toHaveLength(2)
    expect(result[0].active).toBe(true)
    expect(result[1].active).toBe(false)
  })

  it('fetches multiple pages and concatenates results', async () => {
    const bill1 = { ...baseBillRaw, id: '1' }
    const bill2 = {
      ...baseBillRaw,
      id: '2',
      attributes: { ...baseBillRaw.attributes, name: 'Spotify' },
    }
    const page1 = {
      data: [bill1],
      meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 1, total_pages: 2 } },
    }
    const page2 = {
      data: [bill2],
      meta: { pagination: { total: 2, count: 1, per_page: 1, current_page: 2, total_pages: 2 } },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page1),
        })
        .mockResolvedValueOnce({
          ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(page2),
        })
    )
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('returns empty array when no bills in range', async () => {
    mockFetchOk(mockPaginatedResponse([]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result).toEqual([])
  })

  it('throws ApiError on 401', async () => {
    mockFetchError(401)
    await expect(
      fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws on 5xx', async () => {
    mockFetchError(500)
    await expect(
      fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    ).rejects.toThrow()
  })

  it('normalizes pay_dates from Firefly ISO8601 datetime to YYYY-MM-DD', async () => {
    const billWithDatetimePayDates = {
      ...baseBillRaw,
      attributes: {
        ...baseBillRaw.attributes,
        pay_dates: ['2026-04-15T00:00:00+00:00', '2026-05-15T00:00:00+00:00'],
      },
    }
    mockFetchOk(mockPaginatedResponse([billWithDatetimePayDates]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].payDates).toEqual(['2026-04-15', '2026-05-15'])
  })

  it('normalizes paid_dates[].date from Firefly ISO8601 datetime to YYYY-MM-DD', async () => {
    const billWithDatetimePaidDates = {
      ...baseBillRaw,
      attributes: {
        ...baseBillRaw.attributes,
        paid_dates: [
          { date: '2026-04-11T00:00:00+00:00', transaction_journal_id: '5', transaction_group_id: '5' },
        ],
      },
    }
    mockFetchOk(mockPaginatedResponse([billWithDatetimePaidDates]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].paidDates[0].date).toBe('2026-04-11')
  })

  it('normalizes last-day-of-month pay_date (regression: end-of-month datetime would lexically exceed YYYY-MM-DD)', async () => {
    const billWithEndOfMonthDatetime = {
      ...baseBillRaw,
      attributes: {
        ...baseBillRaw.attributes,
        pay_dates: ['2026-04-30T00:00:00+00:00'],
      },
    }
    mockFetchOk(mockPaginatedResponse([billWithEndOfMonthDatetime]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].payDates).toEqual(['2026-04-30'])
  })

  it('normalization is idempotent for already-plain YYYY-MM-DD input', async () => {
    const billWithPlainDates = {
      ...baseBillRaw,
      attributes: {
        ...baseBillRaw.attributes,
        pay_dates: ['2026-04-15'],
      },
    }
    mockFetchOk(mockPaginatedResponse([billWithPlainDates]))
    const result = await fetchBills(BASE_URL, TOKEN, { start: '2026-04-12', end: '2026-04-30' })
    expect(result[0].payDates).toEqual(['2026-04-15'])
  })
})
