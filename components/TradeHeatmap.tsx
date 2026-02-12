'use client'

import { useState, useEffect } from 'react'

interface TradeHeatmapProps {
  account: string
  refreshTrigger?: number
}

interface Trade {
  timestamp: string
  profit: string
}

export default function TradeHeatmap({ account, refreshTrigger }: TradeHeatmapProps) {
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
          arguments: { account, limit: 500 }
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
        <div className="animate-pulse h-64 bg-gray-700 rounded"></div>
      </div>
    )
  }

  // Group trades by day of week and hour
  const heatmapData: { [key: string]: { [key: string]: { profit: number; count: number } } } = {}
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  trades.forEach(trade => {
    const date = new Date(parseInt(trade.timestamp))
    const day = daysOfWeek[date.getDay()]
    const hour = date.getHours()
    
    if (!heatmapData[day]) {
      heatmapData[day] = {}
    }
    if (!heatmapData[day][hour]) {
      heatmapData[day][hour] = { profit: 0, count: 0 }
    }
    
    heatmapData[day][hour].profit += parseFloat(trade.profit)
    heatmapData[day][hour].count += 1
  })

  // Find min/max for color scaling
  let minProfit = 0
  let maxProfit = 0
  
  Object.values(heatmapData).forEach(dayData => {
    Object.values(dayData).forEach(hourData => {
      const avgProfit = hourData.profit / hourData.count
      minProfit = Math.min(minProfit, avgProfit)
      maxProfit = Math.max(maxProfit, avgProfit)
    })
  })

  const getColor = (profit: number) => {
    if (profit === 0) return 'bg-gray-700'
    
    const intensity = Math.abs(profit) / Math.max(Math.abs(minProfit), Math.abs(maxProfit))
    const opacityLevel = Math.min(Math.max(intensity, 0.2), 1)
    
    if (profit > 0) {
      return `bg-green-500 bg-opacity-${Math.round(opacityLevel * 100)}`
    } else {
      return `bg-red-500 bg-opacity-${Math.round(opacityLevel * 100)}`
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Trading Performance Heatmap</h3>
      <p className="text-sm text-gray-400 mb-4">Average P&L by day of week and hour</p>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-16"></div>
            {hours.map(hour => (
              <div key={hour} className="w-8 text-center text-xs text-gray-400">
                {hour}
              </div>
            ))}
          </div>
          
          {/* Heatmap rows */}
          {daysOfWeek.map(day => (
            <div key={day} className="flex mb-1">
              <div className="w-16 text-sm text-gray-400 flex items-center">{day}</div>
              {hours.map(hour => {
                const data = heatmapData[day]?.[hour]
                const avgProfit = data ? data.profit / data.count : 0
                const count = data?.count || 0
                
                return (
                  <div
                    key={hour}
                    className={`w-8 h-8 m-0.5 rounded ${
                      count === 0 ? 'bg-gray-700' : avgProfit >= 0 ? 'bg-profit' : 'bg-loss'
                    }`}
                    style={{
                      opacity: count === 0 ? 0.2 : Math.min(0.3 + (count / 10) * 0.7, 1)
                    }}
                    title={`${day} ${hour}:00 - ${count} trades, Avg: $${avgProfit.toFixed(2)}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-loss rounded"></div>
          <span className="text-gray-400">Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-700 rounded"></div>
          <span className="text-gray-400">No trades</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-profit rounded"></div>
          <span className="text-gray-400">Profit</span>
        </div>
      </div>
    </div>
  )
}
