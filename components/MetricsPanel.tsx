'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, Award } from 'lucide-react'

interface MetricsPanelProps {
  account: string
  refreshTrigger?: number
}

interface Metrics {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_profit: number
  total_loss: number
  net_pnl: number
  average_win: number
  average_loss: number
  profit_factor: number
  largest_win: number
  largest_loss: number
  max_consecutive_wins: number
  max_consecutive_losses: number
}

export default function MetricsPanel({ account, refreshTrigger }: MetricsPanelProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [account, refreshTrigger])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'get_metrics',
          arguments: { account }
        })
      })

      const data = await response.json()
      if (data.result) {
        setMetrics(data.result)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

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

  if (!metrics) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <p className="text-gray-400">No metrics available</p>
      </div>
    )
  }

  const metricCards = [
    {
      label: 'Win Rate',
      value: `${((metrics.win_rate || 0) * 100).toFixed(1)}%`,
      icon: Target,
      color: (metrics.win_rate || 0) >= 0.5 ? 'text-profit' : 'text-loss'
    },
    {
      label: 'Net P&L',
      value: `$${(metrics.net_pnl || 0).toFixed(2)}`,
      icon: DollarSign,
      color: (metrics.net_pnl || 0) >= 0 ? 'text-profit' : 'text-loss'
    },
    {
      label: 'Profit Factor',
      value: (metrics.profit_factor || 0).toFixed(2),
      icon: TrendingUp,
      color: (metrics.profit_factor || 0) >= 1.5 ? 'text-profit' : 'text-yellow-500'
    },
    {
      label: 'Total Trades',
      value: (metrics.total_trades || 0).toString(),
      icon: Award,
      color: 'text-blue-400'
    },
    {
      label: 'Avg Win',
      value: `$${(metrics.average_win || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-profit'
    },
    {
      label: 'Avg Loss',
      value: `$${Math.abs(metrics.average_loss || 0).toFixed(2)}`,
      icon: TrendingDown,
      color: 'text-loss'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {metricCards.map((metric, i) => {
            const Icon = metric.icon
            return (
              <div key={i} className="bg-gray-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{metric.label}</span>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div className={`text-lg font-bold ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Wins:</span>
            <span className="text-profit ml-2 font-semibold">{metrics.winning_trades || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Losses:</span>
            <span className="text-loss ml-2 font-semibold">{metrics.losing_trades || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Best Win:</span>
            <span className="text-profit ml-2 font-semibold">${(metrics.largest_win || 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">Worst Loss:</span>
            <span className="text-loss ml-2 font-semibold">${Math.abs(metrics.largest_loss || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
