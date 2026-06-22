import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-red-100">
            <div className="p-6 sm:p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-500 mb-4 text-sm">
                We're sorry, an unexpected error occurred. Please refresh the page or try again later.
              </p>
              {this.state.error && (
                <div className="w-full mb-6 text-left">
                  <div className="p-3 bg-red-50 text-red-800 text-xs font-mono rounded overflow-auto max-h-48 border border-red-200">
                    <strong>{this.state.error.name}:</strong> {this.state.error.message}
                    <br/><br/>
                    {this.state.error.stack}
                  </div>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#D92638] hover:bg-[#b31c2d] text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D92638]"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
