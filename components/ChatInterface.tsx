'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Zap } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: any[]
}

interface ChatInterfaceProps {
  account: string
  onTradesUpdated?: () => void
  onCommandRef?: (fn: (command: string) => void) => void
}

export default function ChatInterface({ account, onTradesUpdated, onCommandRef }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Clear chat when account changes
  useEffect(() => {
    setMessages([])
  }, [account])

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          active_account: account,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()

      if (data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          toolCalls: data.tool_calls
        }])

        if (data.tool_calls?.some((call: any) =>
          ['write_trade', 'write_trades_batch', 'update_trade'].includes(call.name)
        )) {
          onTradesUpdated?.()
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.'
        }])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to the server. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, account, onTradesUpdated])

  // Expose the sendMessage function to parent via ref callback
  useEffect(() => {
    if (onCommandRef) {
      onCommandRef((command: string) => {
        setInput(command)
        setTimeout(() => {
          sendMessage(command)
        }, 150)
      })
    }
  }, [onCommandRef, sendMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input.trim())
  }

  const suggestions = [
    "Show my recent trades",
    "What's my win rate?",
    "Export winning trades to Google Drive",
    "Push my dataset to QuantConnect",
    "Create a Kaggle dataset from all trades",
    "Which accounts are available?"
  ]

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">AI Trading Assistant</h2>
        <p className="text-sm text-gray-400 mt-1">
          Querying account: <span className="font-mono text-blue-400">{account}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-6">Try asking:</p>
            <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="text-sm text-left px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors flex items-center gap-2"
                >
                  {suggestion.toLowerCase().includes('export') ||
                   suggestion.toLowerCase().includes('push') ||
                   suggestion.toLowerCase().includes('kaggle') ? (
                    <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  ) : null}
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                __html: message.content.replace(
                  /(https?:\/\/[^\s]+)/g,
                  '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline text-blue-300 hover:text-blue-200">$1</a>'
                )
              }}></p>
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
                  Used tools: {message.toolCalls.map(t => t.name).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg px-4 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about trades, trigger exports, run analytics..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
