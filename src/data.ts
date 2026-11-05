import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Account, Balance, Budget, Category, Transfer, Tx } from './types'
import { monthEnd } from './format'

const n = (v: unknown) => Number(v ?? 0)
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const useAccounts = () =>
  useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const rows = check(await supabase.from('accounts').select('*').eq('is_active', true).order('sort_order'))
      return (rows as Account[]).map((a) => ({ ...a, min_balance: n(a.min_balance) }))
    },
  })

/** Semua akun, termasuk yang diarsipkan (untuk halaman pengelolaan akun). */
export const useAllAccounts = () =>
  useQuery({
    queryKey: ['accounts', 'all'],
    queryFn: async () => {
      const rows = check(await supabase.from('accounts').select('*').order('sort_order'))
      return (rows as Account[]).map((a) => ({ ...a, min_balance: n(a.min_balance) }))
    },
  })

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => check(await supabase.from('categories').select('*').order('sort_order')) as Category[],
  })

export const useBalances = () =>
  useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const [res, act] = await Promise.all([
        supabase.from('account_balances').select('*').order('sort_order'),
        supabase.from('accounts').select('id').eq('is_active', true),
      ])
      const rows = check(res)
      const active = new Set((check(act) as { id: string }[]).map((a) => a.id))
      return (rows as Balance[]).filter((b) => active.has(b.account_id)).map((b) => ({ ...b, balance: n(b.balance), min_balance: n(b.min_balance) }))
    },
  })

export const useTransactions = (start: string) =>
  useQuery({
    queryKey: ['transactions', start],
    queryFn: async () => {
      const rows = check(
        await supabase.from('transactions').select('*').gte('tx_date', start).lte('tx_date', monthEnd(start)).order('tx_date', { ascending: false }).order('created_at', { ascending: false }),
      )
      return (rows as Tx[]).map((t) => ({ ...t, amount: n(t.amount) }))
    },
  })

/** Transaksi dari awal bulan `from` sampai akhir bulan `to` (untuk statistik). */
export const useTransactionsRange = (from: string, to: string) =>
  useQuery({
    queryKey: ['transactions', 'range', from, to],
    queryFn: async () => {
      const rows = check(await supabase.from('transactions').select('*').gte('tx_date', from).lte('tx_date', monthEnd(to)).order('tx_date', { ascending: false }).limit(5000))
      return (rows as Tx[]).map((t) => ({ ...t, amount: n(t.amount) }))
    },
  })

export const useTransfers = (start: string) =>
  useQuery({
    queryKey: ['transfers', start],
    queryFn: async () => {
      const rows = check(
        await supabase.from('transfers').select('*').gte('tx_date', start).lte('tx_date', monthEnd(start)).order('tx_date', { ascending: false }),
      )
      return (rows as Transfer[]).map((t) => ({ ...t, amount: n(t.amount), admin_fee: n(t.admin_fee) }))
    },
  })

export const useBudgets = (start: string) =>
  useQuery({
    queryKey: ['budgets', start],
    queryFn: async () => {
      const rows = check(await supabase.from('budgets').select('*').eq('period_start', start))
      return (rows as Budget[]).map((b) => ({ ...b, amount: n(b.amount) }))
    },
  })

/** Mutasi generik: jalankan lalu segarkan semua data. */
export function useAction<A>(fn: (arg: A) => PromiseLike<{ error: { message: string } | null }>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (arg: A) => {
      const { error } = await fn(arg)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
