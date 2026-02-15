'use client'

import { useState } from 'react'
import {
  Cloud, Database, FlaskConical, Upload, Zap,
  Loader2, CheckCircle, XCircle, ChevronRight,
  FileSpreadsheet, Download, ExternalLink
} from 'lucide-react'

interface QuickActionsProps {
  account: string
  onChatCommand?: (command: string) => void
  variant?: 'sidebar' | 'inline'
}

interface QuickAction {
  id: string
  label: string
  description: string
  icon: any
  platform: 'google_drive' | 'quantconnect' | 'kaggle' | 'local'
  color: string
  bgColor: string
  chatCommand: string
  toolConfig: {
    tool: string
    arguments: any
  }
}

export default function QuickActions({ account, onChatCommand, variant = 'sidebar' }: QuickActionsProps) {
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ id: string; success: boolean; message: string; url?: string } | null>(null)

  const actions: QuickAction[] = [
    {
      id: 'drive_all',
      label: 'All Trades → Drive',
      description: 'Export complete dataset to Google Drive',
      icon: Cloud,
      platform: 'google_drive',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      chatCommand: 'Export all my trades to Google Drive as CSV',
      toolConfig: {
        tool: 'export_csv',
        arguments: { account, filename: 'all_trades' },
      },
    },
    {
      id: 'drive_winners',
      label: 'Winners → Drive',
      description: 'Export winning trades only',
      icon: Cloud,
      platform: 'google_drive',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      chatCommand: 'Export only winning trades to Google Drive',
      toolConfig: {
        tool: 'export_csv',
        arguments: { account, min_profit: 0.01, filename: 'winning_trades' },
      },
    },
    {
      id: 'qc_backtest',
      label: 'Backtest Data → QC',
      description: 'Push indicator dataset to QuantConnect',
      icon: Database,
      platform: 'quantconnect',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      chatCommand: 'Push my full trade dataset with indicators to QuantConnect for backtesting',
      toolConfig: {
        tool: 'export_csv',
        arguments: { account, complete_only: true, filename: 'qc_backtest_data' },
      },
    },
    {
      id: 'qc_ml',
      label: 'ML Training → QC',
      description: 'Push ML-ready dataset to QuantConnect',
      icon: Database,
      platform: 'quantconnect',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      chatCommand: 'Create an ML training dataset and push to QuantConnect',
      toolConfig: {
        tool: 'export_csv',
        arguments: { account, complete_only: true, filename: 'ml_training_data' },
      },
    },
    {
      id: 'kaggle_dataset',
      label: 'Publish → Kaggle',
      description: 'Publish trading dataset for ML research',
      icon: FlaskConical,
      platform: 'kaggle',
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      chatCommand: 'Create and publish my NQ futures dataset to Kaggle',
      toolConfig: {
        tool: 'export_csv',
        arguments: { account, filename: 'nq_futures_dataset' },
      },
    },
    {
      id: 'download_csv',
      label: 'Download CSV',
      description: 'Download trade data locally',
      icon: Download,
      platform: 'local',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      chatCommand: 'Export all my trades to CSV and give me a download link',
      toolConfig: {
        tool: 'export_csv',
        arguments: { account, filename: 'trade_export' },
      },
    },
  ]

  const handleAction = async (action: QuickAction) => {
    // If onChatCommand is provided, send to chat instead
    if (onChatCommand) {
      onChatCommand(action.chatCommand)
      return
    }

    // Otherwise, execute directly
    setRunningAction(action.id)
    setLastResult(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.toolConfig),
      })

      const data = await response.json()

      if (data.result?.s3_key) {
        // Get download URL
        const urlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'get_export_url',
            arguments: { s3_key: data.result.s3_key },
          }),
        })
        const urlData = await urlResponse.json()

        setLastResult({
          id: action.id,
          success: true,
          message: `Exported ${data.result.count || 'trades'} successfully`,
          url: urlData.result?.download_url,
        })
      } else {
        throw new Error('Export failed')
      }
    } catch (error: any) {
      setLastResult({
        id: action.id,
        success: false,
        message: error.message || 'Export failed',
      })
    } finally {
      setRunningAction(null)
    }
  }

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-2">
        {actions.slice(0, 4).map(action => {
          const Icon = action.icon
          const isRunning = runningAction === action.id
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={!!runningAction}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${action.bgColor} ${action.color} border border-transparent hover:border-current/20 disabled:opacity-50`}
            >
              {isRunning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {action.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Quick Export Actions
        </h3>
      </div>

      <div className="p-3 space-y-1.5">
        {actions.map(action => {
          const Icon = action.icon
          const isRunning = runningAction === action.id
          const result = lastResult?.id === action.id ? lastResult : null

          return (
            <div key={action.id}>
              <button
                onClick={() => handleAction(action)}
                disabled={!!runningAction}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all hover:bg-gray-700/50 disabled:opacity-50 group"
              >
                <div className={`p-1.5 rounded ${action.bgColor} shrink-0`}>
                  {isRunning ? (
                    <Loader2 className={`h-4 w-4 ${action.color} animate-spin`} />
                  ) : (
                    <Icon className={`h-4 w-4 ${action.color}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">{action.label}</p>
                  <p className="text-xs text-gray-500 truncate">{action.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
              </button>

              {/* Result indicator */}
              {result && (
                <div
                  className={`ml-10 mt-1 mb-2 flex items-center gap-2 text-xs px-2.5 py-1.5 rounded ${
                    result.success
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-3 w-3 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{result.message}</span>
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-blue-400 hover:text-blue-300 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
