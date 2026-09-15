import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0C0A09] text-[#FAFAF9] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20 text-orange-500 font-mono text-xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold font-sans">Something encountered an issue</h1>
            <p className="text-xs text-stone-400 font-mono break-words bg-stone-900/80 p-4 rounded-lg border border-stone-800 text-left">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-mono font-medium transition-colors"
            >
              Clear Cache & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
