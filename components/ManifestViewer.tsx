'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Download } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface Run {
  run_id: string
  created_at: string
  completed_at: string | null
  status: string
  symbol: string
  gate_1_passed: boolean | null
  backtest_win_rate: number | null
  notes: string | null
}

interface Manifest {
  run_id: string
  created_at: string
  completed_at: string | null
  status: string
  pipeline_version: string
  notes: string
  inputs: Record<string, any>
  artifacts: Record<string, any>
  results: Record<string, any>
  stages_completed: any[]
}

export default function ManifestViewer() {
  const [runs, setRuns] = useState<Run[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string>('')
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['results', 'artifacts']))
  const [rawView, setRawView] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchRuns()
  }, [])

  useEffect(() => {
    if (selectedRunId) fetchManifest(selectedRunId)
  }, [selectedRunId])

  const fetchRuns = async () => {
    setLoadingRuns(true)
    try {
      const res = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'list_runs', arguments: { limit: 50, status_filter: 'all' } })
      })
      const data = await res.json()
      const result = data.result || data
      setRuns(result.runs || [])
      if (result.runs?.length > 0 && !selectedRunId) {
        setSelectedRunId(result.runs[0].run_id)
      }
    } catch (e) {
      console.error('Error fetching runs:', e)
    } finally {
      setLoadingRuns(false)
    }
  }

  const fetchManifest = async (runId: string) => {
    setLoading(true)
    setManifest(null)
    try {
      const res = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_run', arguments: { run_id: runId } })
      })
      const data = await res.json()
      const result = data.result || data
      setManifest(result.manifest || null)
    } catch (e) {
      console.error('Error fetching manifest:', e)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  const downloadManifest = async () => {
    if (!manifest) return
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${manifest.run_id}_manifest.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredRuns = runs.filter(r => statusFilter === 'all' || r.status === statusFilter)

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      complete: 'bg-green-500/20 text-green-400 border border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
      snapshot_ready: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    }
    return styles[status] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  }

  const gateIcon = (passed: boolean | null) => {
    if (passed === true) return <CheckCircle className="h-4 w-4 text-green-400" />
    if (passed === false) return <XCircle className="h-4 w-4 text-red-400" />
    return <Clock className="h-4 w-4 text-gray-500" />
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const Section = ({ id, title, children }: { id: string, title: string, children: React.ReactNode }) => (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-left"
      >
        <span className="font-medium text-gray-200 text-sm">{title}</span>
        {expandedSections.has(id)
          ? <ChevronDown className="h-4 w-4 text-gray-400" />
          : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {expandedSections.has(id) && (
        <div className="px-4 py-3 bg-gray-900/30">{children}</div>
      )}
    </div>
  )

  const KV = ({ label, value }: { label: string, value: any }) => (
    <div className="flex items-start justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-400 text-xs font-mono w-48 shrink-0">{label}</span>
      <span className="text-gray-200 text-xs font-mono text-right break-all ml-2">
        {value === null || value === undefined ? <span className="text-gray-600">null</span>
          : typeof value === 'boolean' ? <span className={value ? 'text-green-400' : 'text-red-400'}>{String(value)}</span>
          : String(value)}
      </span>
    </div>
  )

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Left panel — run list */}
      <div className="w-72 shrink-0 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Pipeline Runs</h3>
            <button onClick={fetchRuns} className="p-1 hover:bg-gray-700 rounded transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 text-gray-400 ${loadingRuns ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600"
          >
            <option value="all">All runs</option>
            <option value="in_progress">In progress</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingRuns ? (
            <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
          ) : filteredRuns.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No runs found</div>
          ) : (
            filteredRuns.map(run => (
              <button
                key={run.run_id}
                onClick={() => setSelectedRunId(run.run_id)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors ${
                  selectedRunId === run.run_id ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono text-gray-300 truncate">{run.run_id}</span>
                  {gateIcon(run.gate_1_passed)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge(run.status)}`}>
                    {run.status}
                  </span>
                  <span className="text-[10px] text-gray-500">{formatDate(run.created_at)}</span>
                </div>
                {run.backtest_win_rate !== null && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    WR: {(run.backtest_win_rate * 100).toFixed(1)}%
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — manifest detail */}
      <div className="flex-1 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col overflow-hidden">
        {!manifest && !loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a run to view its manifest
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : manifest ? (
          <>
            {/* Manifest header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-semibold text-white">{manifest.run_id}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge(manifest.status)}`}>
                    {manifest.status}
                  </span>
                  <span className="text-xs text-gray-400">Created: {formatDate(manifest.created_at)}</span>
                  {manifest.completed_at && (
                    <span className="text-xs text-gray-400">Completed: {formatDate(manifest.completed_at)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRawView(!rawView)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                    rawView
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {rawView ? 'Structured' : 'Raw JSON'}
                </button>
                <button
                  onClick={downloadManifest}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-400 hover:border-gray-500 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Manifest body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {rawView ? (
                <pre className="text-xs font-mono text-gray-300 bg-gray-900/50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(manifest, null, 2)}
                </pre>
              ) : (
                <>
                  {/* Gate results — always visible at top */}
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gate Results</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        {gateIcon(manifest.results?.gate_1_passed)}
                        <div>
                          <div className="text-xs text-gray-400">Gate 1</div>
                          <div className={`text-sm font-semibold ${
                            manifest.results?.gate_1_passed ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {manifest.results?.gate_1_passed === null ? 'Pending'
                              : manifest.results?.gate_1_passed ? 'PASS' : 'FAIL'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Win Rate</div>
                        <div className="text-sm font-semibold text-gray-200">
                          {manifest.results?.backtest_win_rate != null
                            ? `${(manifest.results.backtest_win_rate * 100).toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Net Profit</div>
                        <div className={`text-sm font-semibold ${
                          (manifest.results?.backtest_net_profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {manifest.results?.backtest_net_profit != null
                            ? `${manifest.results.backtest_net_profit.toFixed(2)}%` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Total Trades</div>
                        <div className="text-sm font-semibold text-gray-200">
                          {manifest.results?.backtest_total_trades ?? '—'}
                        </div>
                      </div>
                    </div>
                    {manifest.results?.gate_1_reason && (
                      <div className="mt-3 text-xs text-gray-400 bg-gray-800/50 rounded p-2">
                        {manifest.results.gate_1_reason}
                      </div>
                    )}
                  </div>

                  <Section id="results" title="Full Results">
                    {Object.entries(manifest.results || {}).map(([k, v]) => (
                      <KV key={k} label={k} value={v} />
                    ))}
                  </Section>

                  <Section id="artifacts" title={`Artifacts (${Object.keys(manifest.artifacts || {}).length})`}>
                    {Object.entries(manifest.artifacts || {}).map(([k, v]) => (
                      <div key={k} className="mb-2 last:mb-0">
                        <div className="text-xs font-semibold text-blue-400 mb-1">{k}</div>
                        {typeof v === 'object' && v !== null ? (
                          Object.entries(v as Record<string, any>).map(([vk, vv]) => (
                            <KV key={vk} label={`  ${vk}`} value={vv} />
                          ))
                        ) : (
                          <KV label="" value={v} />
                        )}
                      </div>
                    ))}
                  </Section>

                  <Section id="stages" title={`Stages Completed (${manifest.stages_completed?.length ?? 0})`}>
                    <div className="space-y-1">
                      {(manifest.stages_completed || []).map((stage: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 py-1 border-b border-gray-800 last:border-0">
                          <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs text-gray-200 font-mono">{stage.stage}</span>
                            <span className="text-[10px] text-gray-500 ml-2">via {stage.tool}</span>
                            <div className="text-[10px] text-gray-600">{formatDate(stage.completed_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section id="inputs" title="Inputs">
                    {Object.entries(manifest.inputs || {}).map(([k, v]) => (
                      <KV key={k} label={k} value={v} />
                    ))}
                    {manifest.notes && <KV label="notes" value={manifest.notes} />}
                  </Section>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}