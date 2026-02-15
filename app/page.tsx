'use client'

import { useState, useRef } from 'react'
import ChatInterface from '@/components/ChatInterface'
import PerformanceCharts from '@/components/PerformanceCharts'
import TradeHeatmap from '@/components/TradeHeatmap'
import FileUpload from '@/components/FileUpload'
import MetricsPanel from '@/components/MetricsPanel'
import TradesList from '@/components/TradesList'
import IntegrationsPanel from '@/components/IntegrationsPanel'
import QuickActions from '@/components/QuickActions'
import { BarChart3, MessageSquare, Upload, TrendingUp, Link2 } from 'lucide-react'

type Tab = 'chat' | 'charts' | 'upload' | 'trades' | 'integrations'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [account] = useState('APEX1840700000144')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const chatCommandRef = useRef<((cmd: string) => void) | null>(null)

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1)

  const handleChatCommand = (command: string) => {
    // Switch to chat tab and inject command
    setActiveTab('chat')
    if (chatCommandRef.current) {
      chatCommandRef.current(command)
    }
  }

  const tabs = [
    { id: 'chat' as Tab, name: 'AI Chat', icon: MessageSquare },
    { id: 'charts' as Tab, name: 'Analytics', icon: TrendingUp },
    { id: 'trades' as Tab, name: 'Trades', icon: BarChart3 },
    { id: 'integrations' as Tab, name: 'Integrations', icon: Link2 },
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
              <p className="text-sm text-gray-400 mt-1">Account: {account}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Powered by Claude AI
              </div>
            </div>
          </div>
        </div>
      </header>

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
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChatInterface
                account={account}
                onTradesUpdated={triggerRefresh}
                onCommandRef={(fn) => { chatCommandRef.current = fn }}
              />
            </div>
            <div className="space-y-6">
              <MetricsPanel account={account} refreshTrigger={refreshTrigger} />
              <QuickActions
                account={account}
                onChatCommand={handleChatCommand}
                variant="sidebar"
              />
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-6">
            <MetricsPanel account={account} refreshTrigger={refreshTrigger} />
            {/* Inline quick export actions */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Quick Exports</span>
                <button
                  onClick={() => setActiveTab('integrations')}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all integrations →
                </button>
              </div>
              <div className="mt-3">
                <QuickActions account={account} variant="inline" />
              </div>
            </div>
            <PerformanceCharts account={account} refreshTrigger={refreshTrigger} />
            <TradeHeatmap account={account} refreshTrigger={refreshTrigger} />
          </div>
        )}

        {activeTab === 'trades' && (
          <TradesList account={account} refreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsPanel account={account} refreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'upload' && (
          <FileUpload account={account} onUploadComplete={triggerRefresh} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/30 backdrop-blur-sm border-t border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-400">
            Trading Analytics Dashboard • Powered by AWS Bedrock & Anthropic Claude
          </p>
        </div>
      </footer>
    </div>
  )
}
