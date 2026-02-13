'use client'

import { useState, useEffect } from 'react'
import { Download, Filter, ArrowUpDown } from 'lucide-react'

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

export default function TradesList({ account, refreshTrigger }: TradesListProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'profit'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchTrades()
  }, [account, refreshTrigger])

  const fetchTrades = async () => {
  setLoading(true)
  try {
    // Get trades from last 30 days
    const endDate = new Date().toISOString().split('T')[0]  // Today: 2026-02-13
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]  // 30 days ago

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'query_trades',
        arguments: { 
          account, 
          start_date: startDate,  // ← ADD THIS
          end_date: endDate,      // ← ADD THIS
          limit: 100 
        }
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

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'export_csv',
          arguments: { account }
        })
      })

      const data = await response.json()
      if (data.result?.s3_key) {
        // Get download URL
        const urlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'get_export_url',
            arguments: { s3_key: data.result.s3_key }
          })
        })

        const urlData = await urlResponse.json()
        if (urlData.result?.url) {
          window.open(urlData.result.url, '_blank')
        }
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  const filteredTrades = trades.filter(trade => {
    const profit = parseFloat(trade.profit)
    if (filter === 'wins') return profit > 0
    if (filter === 'losses') return profit < 0
    return true
  })

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortBy === 'date') {
      const comparison = parseInt(a.timestamp) - parseInt(b.timestamp)
      return sortOrder === 'asc' ? comparison : -comparison
    } else {
      const comparison = parseFloat(a.profit) - parseFloat(b.profit)
      return sortOrder === 'asc' ? comparison : -comparison
    }
  })

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
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('wins')}
              className={`px-3 py-1 rounded ${
                filter === 'wins' ? 'bg-profit text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => setFilter('losses')}
              className={`px-3 py-1 rounded ${
                filter === 'losses' ? 'bg-loss text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              Losses
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSortBy(sortBy === 'date' ? 'profit' : 'date')}
              className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              <ArrowUpDown className="h-4 w-4" />
              Sort by {sortBy === 'date' ? 'Date' : 'Profit'}
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
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
                    {new Date(parseInt(trade.timestamp)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.action === 'buy' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
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
