export type Grp = 'need' | 'want' | 'saving'
export type TxType = 'expense' | 'income' | 'adjustment'

export interface Account { id: string; name: string; sort_order: number; min_balance: number; include_in_total: boolean; is_active: boolean }
export interface Category { id: string; name: string; type: 'expense' | 'income'; grp: Grp | null; sort_order: number; is_active: boolean }
export interface Tx { id: string; tx_date: string; type: TxType; amount: number; category_id: string | null; account_id: string; note: string | null }
export interface Transfer { id: string; tx_date: string; from_account_id: string; to_account_id: string; amount: number; admin_fee: number; note: string | null }
export interface Budget { id: string; period_start: string; category_id: string; amount: number }
export interface Balance { account_id: string; name: string; sort_order: number; min_balance: number; include_in_total: boolean; balance: number }

export const GRP_LABEL: Record<Grp, string> = { need: 'Kebutuhan', want: 'Keinginan', saving: 'Tabungan' }
