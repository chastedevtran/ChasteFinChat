'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface PerformanceChartsProps {
  account: string
  refreshTrigger?: number
}

interface Trade {
  timestamp: string
  profit: string
  action: string
  entry_price: string
  exit_price: string
}

export default function PerformanceCharts({ account, refreshTrigger }: PerformanceChartsProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrades()
  }, [account, refreshTrigger])

  const fetchTrades = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'query_trades',
          arguments: { account, limit: 100 }
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

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  // Prepare cumulative P&L data
  const cumulativePnl = trades
    .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))
    .reduce((acc: any[], trade, i) => {
      const profit = parseFloat(trade.profit)
      const cumulative = i === 0 ? profit : acc[i - 1].cumulative + profit
      return [...acc, {
        index: i + 1,
        cumulative: parseFloat(cumulative.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        date: new Date(parseInt(trade.timestamp)).toLocaleDateString()
      }]
    }, [])

  // Prepare profit distribution
  const profitDistribution = trades.reduce((acc: any, trade) => {
    const profit = parseFloat(trade.profit)
    if (profit > 0) {
      acc.wins.push(profit)
    } else {
      acc.losses.push(Math.abs(profit))
    }
    return acc
  }, { wins: [] as number[], losses: [] as number[] })

  const distributionData = [
    { name: 'Wins', value: profitDistribution.wins.length, color: '#10b981' },
    { name: 'Losses', value: profitDistribution.losses.length, color: '#ef4444' }
  ]

  // Prepare action distribution
  const actionCounts = trades.reduce((acc: any, trade) => {
    acc[trade.action] = (acc[trade.action] || 0) + 1
    return acc
  }, {})

  const actionData = Object.entries(actionCounts).map(([action, count]) => ({
    action: action.toUpperCase(),
    count
  }))

  return (
    <div className="space-y-6">
      {/* Cumulative P&L */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Cumulative P&L</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cumulativePnl}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="index" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              name="Cumulative P&L ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit per Trade */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Profit per Trade</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cumulativePnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="index" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="profit" name="Profit ($)">
                {cumulativePnl.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Distribution */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Win/Loss Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
