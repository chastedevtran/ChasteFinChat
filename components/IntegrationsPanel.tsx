'use client'

import { useState, useEffect } from 'react'
import {
  Cloud, Database, FlaskConical, Upload, Download, RefreshCw,
  CheckCircle, XCircle, Loader2, Clock, Settings, ChevronDown,
  ChevronUp, Calendar, Filter, FileSpreadsheet, FileJson,
  ExternalLink, Zap, ArrowRight, AlertTriangle, Info
} from 'lucide-react'

interface IntegrationsPanelProps {
  account: string
  refreshTrigger?: number
}

type Platform = 'google_drive' | 'quantconnect' | 'kaggle'
type ExportFormat = 'csv' | 'json'
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'custom'
type DataScope = 'all_trades' | 'winners' | 'losers' | 'entries' | 'exits' | 'with_indicators'

interface ExportConfig {
  platform: Platform
  format: ExportFormat
  datePreset: DatePreset
  customStartDate: string
  customEndDate: string
  dataScope: DataScope
  includeIndicators: boolean
  filename: string
}

interface SyncConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly'
  dayOfWeek?: string
  timeOfDay: string
  lastSync?: string
  nextSync?: string
}

interface ExportJob {
  id: string
  platform: Platform
  status: 'pending' | 'running' | 'success' | 'failed'
  message: string
  timestamp: string
  downloadUrl?: string
}

const PLATFORM_CONFIG = {
  google_drive: {
    name: 'Google Drive',
    icon: Cloud,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    hoverColor: 'hover:border-yellow-500/60',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    description: 'Export trade data and reports to your Google Drive',
    formats: ['csv', 'json'] as ExportFormat[],
    supportsAutoSync: true,
  },
  quantconnect: {
    name: 'QuantConnect',
    icon: Database,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    hoverColor: 'hover:border-cyan-500/60',
    buttonColor: 'bg-cyan-600 hover:bg-cyan-700',
    description: 'Push datasets for backtesting and ML model training',
    formats: ['csv', 'json'] as ExportFormat[],
    supportsAutoSync: true,
  },
  kaggle: {
    name: 'Kaggle',
    icon: FlaskConical,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    hoverColor: 'hover:border-sky-500/60',
    buttonColor: 'bg-sky-600 hover:bg-sky-700',
    description: 'Publish trading datasets for ML research and competitions',
    formats: ['csv'] as ExportFormat[],
    supportsAutoSync: false,
  },
}

const DATA_SCOPES: { value: DataScope; label: string; description: string }[] = [
  { value: 'all_trades', label: 'All Trades', description: 'Complete trade history' },
  { value: 'winners', label: 'Winners Only', description: 'Profitable trades (P&L > 0)' },
  { value: 'losers', label: 'Losers Only', description: 'Losing trades (P&L < 0)' },
  { value: 'entries', label: 'Entry Signals', description: 'Entry signal records only' },
  { value: 'exits', label: 'Exit Signals', description: 'Exit signal records only' },
  { value: 'with_indicators', label: 'With Indicators', description: 'Only trades with full indicator data' },
]

export default function IntegrationsPanel({ account, refreshTrigger }: IntegrationsPanelProps) {
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [exporting, setExporting] = useState<Platform | null>(null)

  const [configs, setConfigs] = useState<Record<Platform, ExportConfig>>({
    google_drive: {
      platform: 'google_drive',
      format: 'csv',
      datePreset: 'month',
      customStartDate: '',
      customEndDate: '',
      dataScope: 'all_trades',
      includeIndicators: true,
      filename: 'trading_data',
    },
    quantconnect: {
      platform: 'quantconnect',
      format: 'csv',
      datePreset: 'all',
      customStartDate: '',
      customEndDate: '',
      dataScope: 'with_indicators',
      includeIndicators: true,
      filename: 'nq_backtest_data',
    },
    kaggle: {
      platform: 'kaggle',
      format: 'csv',
      datePreset: 'all',
      customStartDate: '',
      customEndDate: '',
      dataScope: 'all_trades',
      includeIndicators: true,
      filename: 'nq_futures_trading_dataset',
    },
  })

  const [syncConfigs, setSyncConfigs] = useState<Record<string, SyncConfig>>({
    google_drive: {
      enabled: false,
      frequency: 'daily',
      timeOfDay: '18:00',
      lastSync: undefined,
      nextSync: undefined,
    },
    quantconnect: {
      enabled: false,
      frequency: 'weekly',
      dayOfWeek: 'friday',
      timeOfDay: '16:00',
      lastSync: undefined,
      nextSync: undefined,
    },
  })

  const updateConfig = (platform: Platform, updates: Partial<ExportConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates },
    }))
  }

  const updateSyncConfig = (platform: string, updates: Partial<SyncConfig>) => {
    setSyncConfigs(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates },
    }))
  }

  const getDateRange = (config: ExportConfig) => {
    const now = new Date()
    const endDate = now.toISOString().split('T')[0]

    switch (config.datePreset) {
      case 'today':
        return { start_date: endDate, end_date: endDate }
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { start_date: weekAgo.toISOString().split('T')[0], end_date: endDate }
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return { start_date: monthAgo.toISOString().split('T')[0], end_date: endDate }
      }
      case 'quarter': {
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        return { start_date: quarterAgo.toISOString().split('T')[0], end_date: endDate }
      }
      case 'custom':
        return { start_date: config.customStartDate, end_date: config.customEndDate }
      case 'all':
      default:
        return {}
    }
  }

  const buildQueryArgs = (config: ExportConfig) => {
    const dateRange = getDateRange(config)
    const args: any = { account, ...dateRange, limit: 10000 }

    switch (config.dataScope) {
      case 'winners':
        args.min_profit = 0.01
        break
      case 'losers':
        args.max_profit = -0.01
        break
      case 'entries':
        args.signal_type = 'entry'
        break
      case 'exits':
        args.signal_type = 'exit'
        break
      case 'with_indicators':
        args.complete_only = true
        break
    }

    return args
  }

  const handleExport = async (platform: Platform) => {
    const config = configs[platform]
    setExporting(platform)

    const jobId = `export-${Date.now()}`
    const newJob: ExportJob = {
      id: jobId,
      platform,
      status: 'running',
      message: `Exporting to ${PLATFORM_CONFIG[platform].name}...`,
      timestamp: new Date().toISOString(),
    }
    setExportJobs(prev => [newJob, ...prev])

    try {
      // Step 1: Export to S3
      const queryArgs = buildQueryArgs(config)
      const exportResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'export_csv',
          arguments: {
            ...queryArgs,
            filename: config.filename,
            format: config.format,
          },
        }),
      })

      const exportData = await exportResponse.json()

      if (!exportData.result?.s3_key) {
        throw new Error('Export to S3 failed')
      }

      // Step 2: Platform-specific upload
      if (platform === 'google_drive') {
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'upload_to_drive',
            arguments: {
              s3_key: exportData.result.s3_key,
              filename: `${config.filename}.${config.format}`,
              folder: 'Trading Analytics',
            },
          }),
        })
        const uploadData = await uploadResponse.json()

        setExportJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  status: 'success',
                  message: `Uploaded to Google Drive: Trading Analytics/${config.filename}.${config.format}`,
                  downloadUrl: uploadData.result?.drive_url,
                }
              : j
          )
        )
      } else if (platform === 'quantconnect') {
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'sync_to_qc',
            arguments: {
              s3_key: exportData.result.s3_key,
              dataset_name: config.filename,
              format: config.format,
            },
          }),
        })
        const syncData = await syncResponse.json()

        setExportJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  status: 'success',
                  message: `Synced to QuantConnect: ${config.filename}`,
                  downloadUrl: syncData.result?.qc_url,
                }
              : j
          )
        )
      } else if (platform === 'kaggle') {
        const kaggleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'upload_to_kaggle',
            arguments: {
              s3_key: exportData.result.s3_key,
              dataset_name: config.filename,
              description: `NQ Futures trading dataset - ${config.dataScope} - exported ${new Date().toLocaleDateString()}`,
            },
          }),
        })
        const kaggleData = await kaggleResponse.json()

        setExportJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  status: 'success',
                  message: `Published to Kaggle: ${config.filename}`,
                  downloadUrl: kaggleData.result?.kaggle_url,
                }
              : j
          )
        )
      }

      // Also get a direct download link
      const urlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'get_export_url',
          arguments: { s3_key: exportData.result.s3_key },
        }),
      })
      const urlData = await urlResponse.json()

      if (urlData.result?.download_url) {
        setExportJobs(prev =>
          prev.map(j =>
            j.id === jobId ? { ...j, downloadUrl: j.downloadUrl || urlData.result.download_url } : j
          )
        )
      }
    } catch (error: any) {
      setExportJobs(prev =>
        prev.map(j =>
          j.id === jobId
            ? { ...j, status: 'failed', message: error.message || 'Export failed' }
            : j
        )
      )
    } finally {
      setExporting(null)
    }
  }

  const togglePlatform = (platform: Platform) => {
    setExpandedPlatform(prev => (prev === platform ? null : platform))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Integrations</h2>
          <p className="text-gray-400 mt-1">
            Export and sync your trading data with external platforms
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Info className="h-4 w-4" />
          Account: {account}
        </div>
      </div>

      {/* Platform Cards */}
      {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(platform => {
        const pConfig = PLATFORM_CONFIG[platform]
        const config = configs[platform]
        const syncConfig = syncConfigs[platform]
        const isExpanded = expandedPlatform === platform
        const isExporting = exporting === platform
        const Icon = pConfig.icon

        return (
          <div
            key={platform}
            className={`rounded-xl border transition-all duration-300 ${pConfig.borderColor} ${pConfig.hoverColor} bg-gray-800/60 backdrop-blur-sm overflow-hidden`}
          >
            {/* Card Header */}
            <button
              onClick={() => togglePlatform(platform)}
              className="w-full p-6 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${pConfig.bgColor}`}>
                  <Icon className={`h-6 w-6 ${pConfig.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{pConfig.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{pConfig.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {syncConfig?.enabled && (
                  <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                    <RefreshCw className="h-3 w-3" />
                    Auto-sync {syncConfig.frequency}
                  </span>
                )}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleExport(platform)
                  }}
                  disabled={isExporting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                    isExporting
                      ? 'bg-gray-600 cursor-not-allowed'
                      : pConfig.buttonColor
                  }`}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export Now'}
                </button>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Config Panel */}
            {isExpanded && (
              <div className="px-6 pb-6 space-y-5 border-t border-gray-700/50 pt-5">
                {/* Export Format */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Format Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <FileSpreadsheet className="inline h-4 w-4 mr-1.5" />
                      Export Format
                    </label>
                    <div className="flex gap-2">
                      {pConfig.formats.map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => updateConfig(platform, { format: fmt })}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            config.format === fmt
                              ? `${pConfig.buttonColor} text-white`
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {fmt === 'csv' && <FileSpreadsheet className="inline h-3.5 w-3.5 mr-1.5" />}
                          {fmt === 'json' && <FileJson className="inline h-3.5 w-3.5 mr-1.5" />}
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1.5" />
                      Date Range
                    </label>
                    <select
                      value={config.datePreset}
                      onChange={e =>
                        updateConfig(platform, { datePreset: e.target.value as DatePreset })
                      }
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="quarter">Last 90 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {/* Data Scope */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Filter className="inline h-4 w-4 mr-1.5" />
                      Data Scope
                    </label>
                    <select
                      value={config.dataScope}
                      onChange={e =>
                        updateConfig(platform, { dataScope: e.target.value as DataScope })
                      }
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      {DATA_SCOPES.map(scope => (
                        <option key={scope.value} value={scope.value}>
                          {scope.label} — {scope.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Date Range */}
                {config.datePreset === 'custom' && (
                  <div className="flex gap-3 items-center">
                    <input
                      type="date"
                      value={config.customStartDate}
                      onChange={e => updateConfig(platform, { customStartDate: e.target.value })}
                      className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
                    />
                    <ArrowRight className="h-4 w-4 text-gray-500" />
                    <input
                      type="date"
                      value={config.customEndDate}
                      onChange={e => updateConfig(platform, { customEndDate: e.target.value })}
                      className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
                    />
                  </div>
                )}

                {/* Filename */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filename
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={config.filename}
                      onChange={e => updateConfig(platform, { filename: e.target.value })}
                      className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="export_filename"
                    />
                    <span className="text-gray-500 text-sm">.{config.format}</span>
                  </div>
                </div>

                {/* Include Indicators Toggle */}
                <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                  <div>
                    <span className="text-sm font-medium text-gray-300">Include Indicator Data</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      barDelta, ROC slope, ATR slope, cumulative delta
                    </p>
                  </div>
                  <button
                    onClick={() => updateConfig(platform, { includeIndicators: !config.includeIndicators })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      config.includeIndicators ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        config.includeIndicators ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Auto-Sync Configuration */}
                {pConfig.supportsAutoSync && syncConfig && (
                  <div className="border-t border-gray-700/50 pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <RefreshCw className={`h-4 w-4 ${syncConfig.enabled ? 'text-green-400' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium text-gray-300">Auto-Sync Schedule</span>
                      </div>
                      <button
                        onClick={() => updateSyncConfig(platform, { enabled: !syncConfig.enabled })}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          syncConfig.enabled ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            syncConfig.enabled ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {syncConfig.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Frequency</label>
                          <select
                            value={syncConfig.frequency}
                            onChange={e =>
                              updateSyncConfig(platform, { frequency: e.target.value as 'daily' | 'weekly' })
                            }
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Time</label>
                          <input
                            type="time"
                            value={syncConfig.timeOfDay}
                            onChange={e => updateSyncConfig(platform, { timeOfDay: e.target.value })}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
                          />
                        </div>
                        {syncConfig.frequency === 'weekly' && (
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-400 mb-1.5">Day of Week</label>
                            <select
                              value={syncConfig.dayOfWeek}
                              onChange={e => updateSyncConfig(platform, { dayOfWeek: e.target.value })}
                              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
                            >
                              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                                <option key={day} value={day}>
                                  {day.charAt(0).toUpperCase() + day.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Export History */}
      {exportJobs.length > 0 && (
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Recent Exports
          </h3>
          <div className="space-y-3">
            {exportJobs.slice(0, 10).map(job => {
              const pConfig = PLATFORM_CONFIG[job.platform]
              const Icon = pConfig.icon
              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${pConfig.bgColor}`}>
                      <Icon className={`h-4 w-4 ${pConfig.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">{job.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(job.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'running' && (
                      <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                    )}
                    {job.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                    {job.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    {job.downloadUrl && (
                      <a
                        href={job.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-300 mb-1">Using AI Chat for Exports</p>
          <p className="text-gray-400">
            You can also trigger exports from the AI Chat tab. Try commands like:{' '}
            <span className="text-blue-300">"Export my winning trades to Google Drive"</span>,{' '}
            <span className="text-blue-300">"Push last month's data to QuantConnect"</span>, or{' '}
            <span className="text-blue-300">"Create a Kaggle dataset with all indicator data"</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
