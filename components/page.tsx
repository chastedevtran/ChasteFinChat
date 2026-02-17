'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import PerformanceCharts from '@/components/PerformanceCharts'
import TradeHeatmap from '@/components/TradeHeatmap'
import FileUpload from '@/components/FileUpload'
import MetricsPanel from '@/components/MetricsPanel'
import TradesList from '@/components/TradesList'
import { BarChart3, MessageSquare, Upload, TrendingUp, ChevronDown } from 'lucide-react'

type Tab = 'chat' | 'charts' | 'upload' | 'trades'

interface AccountInfo {
  account: string
  total_trades: number
  complete: number
  total_pnl: number
  latest_activity: string
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [account, setAccount] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1)

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'list_accounts',
          arguments: {}
        })
      })

      const data = await response.json()
      const result = data.result || data
      const accts = result.accounts || []

      setAccounts(accts)

      // Default to the most recently active account
      if (accts.length > 0 && !account) {
        setAccount(accts[0].account)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      // Fallback to known accounts if API fails
      setAccount('APEX1840700000143')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleAccountChange = (newAccount: string) => {
    setAccount(newAccount)
    setShowAccountDropdown(false)
    setRefreshTrigger(prev => prev + 1) // Refresh all data for new account
  }

  const selectedAccountInfo = accounts.find(a => a.account === account)

  const tabs = [
    { id: 'chat' as Tab, name: 'AI Chat', icon: MessageSquare },
    { id: 'charts' as Tab, name: 'Analytics', icon: TrendingUp },
    { id: 'trades' as Tab, name: 'Trades', icon: BarChart3 },
    { id: 'upload' as Tab, name: 'Upload', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Trading Analytics</h1>

              {/* Account Selector */}
              <div className="relative mt-1">
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg px-3 py-1.5 transition-colors"
                  disabled={loadingAccounts}
                >
                  {loadingAccounts ? (
                    <span className="text-gray-400">Loading accounts...</span>
                  ) : (
                    <>
                      <span className="font-mono">{account || 'Select Account'}</span>
                      {selectedAccountInfo && (
                        <span className="text-gray-400">
                          ({selectedAccountInfo.total_trades} trades)
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </>
                  )}
                </button>

                {/* Dropdown */}
                {showAccountDropdown && accounts.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-96 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
                    {accounts.map((acct) => (
                      <button
                        key={acct.account}
                        onClick={() => handleAccountChange(acct.account)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 ${
                          acct.account === account ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-white">{acct.account}</span>
                          <span className={`text-sm font-medium ${
                            acct.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            ${acct.total_pnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span>{acct.total_trades} trades</span>
                          {acct.complete > 0 && <span>{acct.complete} complete</span>}
                          {acct.latest_activity && (
                            <span>Last: {acct.latest_activity.slice(0, 10)}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Powered by Claude AI
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close dropdown */}
      {showAccountDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAccountDropdown(false)}
        />
      )}

      {/* Tab Navigation */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!account && !loadingAccounts ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-12 text-center">
            <p className="text-gray-400 text-lg">No trading accounts found.</p>
            <p className="text-gray-500 mt-2">Upload trade data or wait for TradingView signals to populate.</p>
          </div>
        ) : (
          <>
            {activeTab === 'chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ChatInterface account={account} onTradesUpdated={triggerRefresh} />
                </div>
                <div>
                  <MetricsPanel account={account} refreshTrigger={refreshTrigger} />
                </div>
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="space-y-6">
                <MetricsPanel account={account} refreshTrigger={refreshTrigger} />
                <PerformanceCharts account={account} refreshTrigger={refreshTrigger} />
                <TradeHeatmap account={account} refreshTrigger={refreshTrigger} />
              </div>
            )}

            {activeTab === 'trades' && (
              <TradesList account={account} refreshTrigger={refreshTrigger} />
            )}

            {activeTab === 'upload' && (
              <FileUpload account={account} onUploadComplete={triggerRefresh} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/30 backdrop-blur-sm border-t border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-400">
            Trading Analytics Dashboard • Powered by AWS & Anthropic Claude
          </p>
        </div>
      </footer>
    </div>
  )
}