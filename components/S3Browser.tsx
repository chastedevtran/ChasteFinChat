'use client'

import { useState } from 'react'
import { Folder, FileText, RefreshCw, ChevronRight, Download, ArrowLeft, Search, Copy, Check } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const BUCKET = 'trading-data-exports'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-500 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

interface S3Object {
  s3_key: string
  size_bytes: number
  size_mb: number
  last_modified: string
  category: string
}

interface BreadcrumbItem {
  label: string
  prefix: string
}

const TOP_LEVEL_PREFIXES = [
  { label: 'runs/', prefix: 'runs/', icon: '🚀', description: 'Pipeline run artifacts' },
  { label: 'configs/', prefix: 'configs/', icon: '⚙️', description: 'Strategy configs & aliases' },
  { label: 'exports/', prefix: 'exports/', icon: '📤', description: 'Trade CSV exports' },
  { label: 'datasets/', prefix: 'datasets/', icon: '📊', description: 'IB historical datasets' },
  { label: 'latest/', prefix: 'latest/', icon: '⭐', description: 'Promoted run artifacts' },
  { label: 'models/', prefix: 'models/', icon: '🤖', description: 'Trained ML models' },
  { label: 'strategy/', prefix: 'strategy/', icon: '📋', description: 'QC strategy templates' },
]

export default function S3Browser() {
  const [currentPrefix, setCurrentPrefix] = useState<string | null>(null)
  const [objects, setObjects] = useState<S3Object[]>([])
  const [loading, setLoading] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [search, setSearch] = useState('')
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<{ key: string, content: string } | null>(null)

  const loadPrefix = async (prefix: string, label: string) => {
    setLoading(true)
    setSearch('')
    try {
      const res = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'list_datasets',
          arguments: { prefix, limit: '100' }
        })
      })
      const data = await res.json()
      const result = data.result || data
      setObjects(result.files || [])
      setCurrentPrefix(prefix)

      // Build breadcrumbs
      const parts = prefix.split('/').filter(Boolean)
      const crumbs: BreadcrumbItem[] = []
      let accumulated = ''
      for (const part of parts) {
        accumulated += part + '/'
        crumbs.push({ label: part, prefix: accumulated })
      }
      setBreadcrumbs(crumbs)
    } catch (e) {
      console.error('Error listing S3:', e)
    } finally {
      setLoading(false)
    }
  }

  const getDownloadUrl = async (s3Key: string) => {
    setDownloadingKey(s3Key)
    try {
      const res = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'get_export_url',
          arguments: { s3_key: s3Key, expiration: 3600 }
        })
      })
      const data = await res.json()
      const result = data.result || data
      if (result.download_url) {
        window.open(result.download_url, '_blank')
      }
    } catch (e) {
      console.error('Error getting download URL:', e)
    } finally {
      setDownloadingKey(null)
    }
  }

  const previewFile = async (s3Key: string) => {
    if (!s3Key.endsWith('.json') && !s3Key.endsWith('.py') && !s3Key.endsWith('.pine') && !s3Key.endsWith('.txt')) return
    try {
      const res = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'get_export_url',
          arguments: { s3_key: s3Key, expiration: 60 }
        })
      })
      const data = await res.json()
      const result = data.result || data
      if (result.download_url) {
        const fileRes = await fetch(result.download_url)
        const text = await fileRes.text()
        setPreviewContent({ key: s3Key, content: text.slice(0, 10000) })
      }
    } catch (e) {
      console.error('Preview error:', e)
    }
  }

  // Extract virtual folders from flat file list
  const getVirtualFolders = (files: S3Object[], prefix: string): string[] => {
    const folders = new Set<string>()
    for (const f of files) {
      const relative = f.s3_key.slice(prefix.length)
      const parts = relative.split('/')
      if (parts.length > 1) {
        folders.add(parts[0])
      }
    }
    return Array.from(folders).sort()
  }

  const getFilesInCurrentLevel = (files: S3Object[], prefix: string): S3Object[] => {
    return files.filter(f => {
      const relative = f.s3_key.slice(prefix.length)
      return !relative.includes('/')
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const isPreviewable = (key: string) =>
    key.endsWith('.json') || key.endsWith('.py') || key.endsWith('.pine') || key.endsWith('.txt')

  const filteredObjects = search
    ? objects.filter(o => o.s3_key.toLowerCase().includes(search.toLowerCase()))
    : objects

  const virtualFolders = currentPrefix ? getVirtualFolders(filteredObjects, currentPrefix) : []
  const currentFiles = currentPrefix ? getFilesInCurrentLevel(filteredObjects, currentPrefix) : []

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>S3 Browser</span>
            <span className="text-xs text-gray-400 font-normal font-mono">{BUCKET}</span>
          </h3>
          {currentPrefix && (
            <button
              onClick={() => { setCurrentPrefix(null); setObjects([]); setBreadcrumbs([]) }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </button>
          )}
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 text-xs mb-3 flex-wrap">
            <button
              onClick={() => { setCurrentPrefix(null); setObjects([]); setBreadcrumbs([]) }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              root
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-600" />
                <button
                  onClick={() => loadPrefix(crumb.prefix, crumb.label)}
                  className={i === breadcrumbs.length - 1
                    ? 'text-gray-200 cursor-default'
                    : 'text-blue-400 hover:text-blue-300 transition-colors'}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        {currentPrefix && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="w-full bg-gray-700 text-gray-200 text-xs rounded pl-8 pr-3 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* File/folder list */}
        <div className={`${previewContent ? 'w-1/2' : 'w-full'} overflow-y-auto`}>
          {/* Top-level buckets */}
          {!currentPrefix && (
            <div className="p-4 grid grid-cols-2 gap-3">
              {TOP_LEVEL_PREFIXES.map(item => (
                <button
                  key={item.prefix}
                  onClick={() => loadPrefix(item.prefix, item.label)}
                  className="flex items-start gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors text-left"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="text-sm font-mono text-gray-200">{item.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          )}

          {/* Virtual folders */}
          {!loading && currentPrefix && virtualFolders.length > 0 && (
            <div className="px-4 pt-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Folders</div>
              {virtualFolders.map(folder => (
                <button
                  key={folder}
                  onClick={() => loadPrefix(`${currentPrefix}${folder}/`, folder)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/50 rounded-lg transition-colors text-left mb-1"
                >
                  <Folder className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="text-sm text-gray-200 font-mono">{folder}/</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-600 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {/* Files */}
          {!loading && currentPrefix && currentFiles.length > 0 && (
            <div className="px-4 pt-3 pb-4">
              {virtualFolders.length > 0 && (
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 mt-3">Files</div>
              )}
              {currentFiles.map(file => {
                const filename = file.s3_key.split('/').pop() || file.s3_key
                const isActive = previewContent?.key === file.s3_key
                return (
                  <div
                    key={file.s3_key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 group ${
                      isActive ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-mono truncate ${
                          isPreviewable(filename) ? 'text-blue-400 cursor-pointer hover:text-blue-300' : 'text-gray-200'
                        }`}
                        onClick={() => isPreviewable(filename) && previewFile(file.s3_key)}
                      >
                        {filename}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {formatSize(file.size_bytes)} · {formatDate(file.last_modified)}
                      </div>
                    </div>
                    <button
                      onClick={() => getDownloadUrl(file.s3_key)}
                      disabled={downloadingKey === file.s3_key}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
                      title="Download"
                    >
                      {downloadingKey === file.s3_key
                        ? <RefreshCw className="h-3.5 w-3.5 text-gray-400 animate-spin" />
                        : <Download className="h-3.5 w-3.5 text-gray-400" />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && currentPrefix && virtualFolders.length === 0 && currentFiles.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              {search ? 'No files match your search' : 'This folder is empty'}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {previewContent && (
          <div className="w-1/2 border-l border-gray-700 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/50">
              <span className="text-xs font-mono text-gray-300 truncate">
                {previewContent.key.split('/').pop()}
              </span>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <CopyButton text={previewContent.content} />
                <button
                  onClick={() => setPreviewContent(null)}
                  className="text-gray-500 hover:text-gray-300 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap bg-gray-900/30">
              {previewContent.key.endsWith('.json')
                ? JSON.stringify(JSON.parse(previewContent.content), null, 2)
                : previewContent.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}