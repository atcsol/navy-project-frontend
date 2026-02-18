'use client'

import { useEffect, useState } from 'react'

interface LoadingProgressProps {
  message?: string
  subMessage?: string
  progress?: number // 0-100, se undefined = spinner infinito
  variant?: 'spinner' | 'bar' | 'dots'
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingProgress({
  message = 'Carregando...',
  subMessage,
  progress,
  variant = 'spinner',
  size = 'md',
}: LoadingProgressProps) {
  const [dots, setDots] = useState('')

  // Animação de dots "..."
  useEffect(() => {
    if (variant === 'dots') {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [variant])

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const spinnerSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      {/* Spinner ou Barra de Progresso */}
      {variant === 'spinner' && (
        <div className={`${spinnerSizes[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
      )}

      {variant === 'bar' && (
        <div className="w-full max-w-md">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${progress || 0}%` }}
            >
              {/* Efeito de "shimmer" */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          {progress !== undefined && (
            <div className="text-center mt-2 text-sm text-gray-600 font-medium">
              {Math.round(progress)}%
            </div>
          )}
        </div>
      )}

      {variant === 'dots' && (
        <div className="flex space-x-2">
          <div className={`${spinnerSizes[size]} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
          <div className={`${spinnerSizes[size]} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
          <div className={`${spinnerSizes[size]} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Mensagem */}
      <div className="text-center space-y-1">
        <p className={`${sizeClasses[size]} font-medium text-gray-700`}>
          {message}
          {variant === 'dots' && <span className="w-8 inline-block text-left">{dots}</span>}
        </p>
        {subMessage && (
          <p className="text-sm text-gray-500">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  )
}

// Componente de Overlay de Loading (bloqueia a tela toda)
interface LoadingOverlayProps extends LoadingProgressProps {
  show: boolean
}

export function LoadingOverlay({ show, ...props }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 min-w-[300px]">
        <LoadingProgress {...props} />
      </div>
    </div>
  )
}

// Hook para loading states
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')

  const startLoading = (msg = 'Carregando...') => {
    setIsLoading(true)
    setProgress(0)
    setMessage(msg)
  }

  const updateProgress = (value: number, msg?: string) => {
    setProgress(value)
    if (msg) setMessage(msg)
  }

  const finishLoading = () => {
    setProgress(100)
    setTimeout(() => {
      setIsLoading(false)
      setProgress(0)
    }, 300)
  }

  const stopLoading = () => {
    setIsLoading(false)
    setProgress(0)
  }

  return {
    isLoading,
    progress,
    message,
    startLoading,
    updateProgress,
    finishLoading,
    stopLoading,
  }
}
