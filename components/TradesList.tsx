'use client'

import { useState, useEffect } from 'react'
import { Download, Filter, ArrowUpDown, X, Calendar, DollarSign, TrendingUp } from 'lucide-react'

// --- Timestamp utility (handles both Unix ms and ISO strings) ---
function parseTimestamp(ts: string): number {
  if (!ts) return 0
  if (/^\d+$/.test(ts)) return parseInt(ts, 10)
  const parsed = new Date(ts).getTime()
  return isNaN(parsed) ? 0 : parsed
}

function formatTimestamp(ts: string): string {
  const ms = parseTimestamp(ts)
  if (ms === 0) return 'N/A'
  return new Date(ms).toLocaleString()
}
// --- End utility ---

interface TradesListProps {
  account: string
  refreshTrigger?: number
}

interface Trade {
  trade_id: string
  timestamp: string
  action: string
  ticker: string
  entry_price: string
  exit_price: string
  quantity: string
  profit: string
  indicators?: any
}

interface Filters {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom'
  customStartDate: string
  customEndDate: string
  profitFilter: 'all' | 'wins' | 'losses'
  action: 'all' | 'buy' | 'sell'
  minProfit: string
  maxProfit: string
  ticker: string
}

export default function TradesList({ account, refreshTrigger }: TradesListProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'profit'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [filters, setFilters] = useState<Filters>({
    dateRange: 'month',
    customStartDate: '',
    customEndDate: '',
    profitFilter: 'all',
    action: 'all',
    minProfit: '',
    maxProfit: '',
    ticker: ''
  })

  useEffect(() => {
    fetchTrades()
  }, [account, refreshTrigger])

  const getDateRange = () => {
    const now = new Date()
    const endDate = now.toISOString().split('T')[0]
    let startDate = ''

    switch (filters.dateRange) {
      case 'today':
        startDate = endDate
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        startDate = weekAgo.toISOString().split('T')[0]
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        startDate = monthAgo.toISOString().split('T')[0]
        break
      case 'custom':
        return {
          start_date: filters.customStartDate,
          end_date: filters.customEndDate
        }
      case 'all':
      default:
        return {}
    }

    return { start_date: startDate, end_date: endDate }
  }

  const fetchTrades = async () => {
    setLoading(true)
    try {
      const dateRange = getDateRange()
      const queryArgs: any = { 
        account, 
        limit: 1000,
        ...dateRange
      }

      // Add filters
      if (filters.action !== 'all') {
        queryArgs.action = filters.action.toUpperCase()
      }

      if (filters.minProfit) {
        queryArgs.min_profit = parseFloat(filters.minProfit)
      }

      if (filters.maxProfit) {
        queryArgs.max_profit = parseFloat(filters.maxProfit)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'query_trades',
          arguments: queryArgs
        })
      })

      const data = await response.json()
      if (data.result?.trades) {
        setTrades(data.result.trades)
      }
    } catch (error) {
      console.error('Error fetching trades:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    fetchTrades()
  }

  const handleResetFilters = () => {
    setFilters({
      dateRange: 'month',
      customStartDate: '',
      customEndDate: '',
      profitFilter: 'all',
      action: 'all',
      minProfit: '',
      maxProfit: '',
      ticker: ''
    })
  }

  const handleExportCSV = async () => {
    try {
      const dateRange = getDateRange()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'export_csv',
          arguments: { account, ...dateRange }
        })
      })

      const data = await response.json()
      if (data.result?.s3_key) {
        const urlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'get_export_url',
            arguments: { s3_key: data.result.s3_key }
          })
        })

        const urlData = await urlResponse.json()
        if (urlData.result?.download_url) {
          window.open(urlData.result.download_url, '_blank')
        }
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  const filteredTrades = trades.filter(trade => {
    const profit = parseFloat(trade.profit)
    
    // Profit filter
    if (filters.profitFilter === 'wins' && profit <= 0) return false
    if (filters.profitFilter === 'losses' && profit >= 0) return false
    
    // Ticker filter
    if (filters.ticker && trade.ticker && !trade.ticker.toLowerCase().includes(filters.ticker.toLowerCase())) {
      return false
    }
    
    return true
  })

  // FIXED: Use parseTimestamp for correct sorting of mixed formats
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortBy === 'date') {
      const comparison = parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
      return sortOrder === 'asc' ? comparison : -comparison
    } else {
      const comparison = parseFloat(a.profit) - parseFloat(b.profit)
      return sortOrder === 'asc' ? comparison : -comparison
    }
  })

  // Calculate stats
  const totalProfit = filteredTrades.reduce((sum, t) => sum + parseFloat(t.profit), 0)
  const winningTrades = filteredTrades.filter(t => parseFloat(t.profit) > 0).length
  const losingTrades = filteredTrades.filter(t => parseFloat(t.profit) < 0).length
  const winRate = filteredTrades.length > 0 ? (winningTrades / filteredTrades.length * 100) : 0

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Trade History</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Total Trades</div>
            <div className="text-lg font-semibold text-white">{filteredTrades.length}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Win Rate</div>
            <div className="text-lg font-semibold text-profit">{winRate.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Total P&L</div>
            <div className={`text-lg font-semibold ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
              ${totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">W/L Ratio</div>
            <div className="text-lg font-semibold text-white">{winningTrades}/{losingTrades}</div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-gray-700/30 rounded-lg p-4 mb-4 space-y-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date Range
              </label>
              <div className="flex gap-2 mb-2">
                {(['all', 'today', 'week', 'month', 'custom'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setFilters({ ...filters, dateRange: range })}
                    className={`px-3 py-1 rounded text-sm ${
                      filters.dateRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
              {filters.dateRange === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.customStartDate}
                    onChange={(e) => setFilters({ ...filters, customStartDate: e.target.value })}
                    className="bg-gray-700 text-white px-3 py-2 rounded"
                  />
                  <span className="text-gray-400 self-center">to</span>
                  <input
                    type="date"
                    value={filters.customEndDate}
                    onChange={(e) => setFilters({ ...filters, customEndDate: e.target.value })}
                    className="bg-gray-700 text-white px-3 py-2 rounded"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value as any })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="all">All</option>
                  <option value="buy">Buy Only</option>
                  <option value="sell">Sell Only</option>
                </select>
              </div>

              {/* Profit Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Result</label>
                <select
                  value={filters.profitFilter}
                  onChange={(e) => setFilters({ ...filters, profitFilter: e.target.value as any })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="all">All</option>
                  <option value="wins">Winners Only</option>
                  <option value="losses">Losers Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Min Profit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Min Profit
                </label>
                <input
                  type="number"
                  value={filters.minProfit}
                  onChange={(e) => setFilters({ ...filters, minProfit: e.target.value })}
                  placeholder="e.g., -100"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>

              {/* Max Profit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Max Profit
                </label>
                <input
                  type="number"
                  value={filters.maxProfit}
                  onChange={(e) => setFilters({ ...filters, maxProfit: e.target.value })}
                  placeholder="e.g., 500"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
              </div>
            </div>

            {/* Ticker Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <TrendingUp className="inline h-4 w-4 mr-1" />
                Search Ticker
              </label>
              <input
                type="text"
                value={filters.ticker}
                onChange={(e) => setFilters({ ...filters, ticker: e.target.value })}
                placeholder="e.g., NQH2026"
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Quick Filters & Sort */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSortBy(sortBy === 'date' ? 'profit' : 'date')}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort: {sortBy === 'date' ? 'Date' : 'Profit'}
          </button>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Entry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Exit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Profit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedTrades.map((trade) => {
              const profit = parseFloat(trade.profit)
              return (
                <tr key={trade.trade_id} className="hover:bg-gray-700/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatTimestamp(trade.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.action === 'buy' || trade.action === 'long'
                        ? 'bg-blue-600 text-white' 
                        : 'bg-purple-600 text-white'
                    }`}>
                      {trade.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {trade.ticker}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${parseFloat(trade.entry_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${parseFloat(trade.exit_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {trade.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={profit >= 0 ? 'text-profit' : 'text-loss'}>
                      ${profit.toFixed(2)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
        Showing {sortedTrades.length} of {trades.length} trades
      </div>
    </div>
  )
}
