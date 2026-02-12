'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface FileUploadProps {
  account: string
  onUploadComplete?: () => void
}

interface ParsedTrade {
  timestamp: string
  action: string
  entry_price: string
  exit_price: string
  quantity: string
  profit: string
  ticker?: string
  interval?: string
  indicators?: any
}

export default function FileUpload({ account, onUploadComplete }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [preview, setPreview] = useState<ParsedTrade[]>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const parseCSV = (file: File): Promise<ParsedTrade[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          resolve(results.data as ParsedTrade[])
        },
        error: reject
      })
    })
  }

  const parseExcel = (file: File): Promise<ParsedTrade[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet) as ParsedTrade[]
          resolve(json)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsBinaryString(file)
    })
  }

  const parseJSON = (file: File): Promise<ParsedTrade[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          resolve(Array.isArray(json) ? json : [json])
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const processFile = async (file: File) => {
    try {
      setUploading(true)
      setResult(null)
      setPreview([])

      let trades: ParsedTrade[]

      if (file.name.endsWith('.csv')) {
        trades = await parseCSV(file)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        trades = await parseExcel(file)
      } else if (file.name.endsWith('.json')) {
        trades = await parseJSON(file)
      } else {
        throw new Error('Unsupported file type. Please upload CSV, Excel, or JSON.')
      }

      // Filter out empty rows
      trades = trades.filter(t => t.timestamp && t.action)

      if (trades.length === 0) {
        throw new Error('No valid trades found in file')
      }

      // Show preview
      setPreview(trades.slice(0, 5))

      // Upload to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'write_trades_batch',
          arguments: {
            trades: trades.map(t => ({
              ...t,
              account
            }))
          }
        })
      })

      const data = await response.json()

      if (data.result) {
        setResult({
          success: true,
          message: `Successfully uploaded ${trades.length} trades!`
        })
        onUploadComplete?.()
      } else {
        throw new Error('Failed to upload trades')
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to process file'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }, [account])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Upload Trade Data</h2>
        <p className="text-gray-400 mb-6">
          Upload CSV, Excel (.xlsx, .xls), or JSON files containing your trade data
        </p>

        <form
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleChange}
            disabled={uploading}
          />

          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center">
              {uploading ? (
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              ) : (
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
              )}
              
              <p className="text-lg font-medium text-white mb-2">
                {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
              </p>
              <p className="text-sm text-gray-400">
                Supports CSV, Excel (.xlsx, .xls), and JSON
              </p>
            </div>
          </label>
        </form>

        {/* Result */}
        {result && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
              result.success ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'
            }`}
          >
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <p className={result.success ? 'text-green-400' : 'text-red-400'}>
              {result.message}
            </p>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Preview (first 5 rows)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-300">Timestamp</th>
                  <th className="px-4 py-2 text-left text-gray-300">Action</th>
                  <th className="px-4 py-2 text-left text-gray-300">Entry</th>
                  <th className="px-4 py-2 text-left text-gray-300">Exit</th>
                  <th className="px-4 py-2 text-left text-gray-300">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {preview.map((trade, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-300">{trade.timestamp}</td>
                    <td className="px-4 py-2 text-gray-300">{trade.action}</td>
                    <td className="px-4 py-2 text-gray-300">{trade.entry_price}</td>
                    <td className="px-4 py-2 text-gray-300">{trade.exit_price}</td>
                    <td className={`px-4 py-2 ${parseFloat(trade.profit) >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {trade.profit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Format Guide */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Expected File Format
        </h3>
        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-medium mb-2">Required columns:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><code className="text-blue-400">timestamp</code> - Unix timestamp or ISO date</li>
              <li><code className="text-blue-400">action</code> - "buy" or "sell"</li>
              <li><code className="text-blue-400">entry_price</code> - Entry price</li>
              <li><code className="text-blue-400">exit_price</code> - Exit price</li>
              <li><code className="text-blue-400">quantity</code> - Trade quantity</li>
              <li><code className="text-blue-400">profit</code> - P&L for the trade</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Optional columns:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><code className="text-blue-400">ticker</code> - Instrument ticker</li>
              <li><code className="text-blue-400">interval</code> - Timeframe</li>
              <li><code className="text-blue-400">indicators</code> - JSON object with indicator values</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
