import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in NPMS page component:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-surface-container border border-outline-variant rounded-xl max-w-[600px] mx-auto mt-12 text-center font-sans shadow-md animate-fade-in-up">
          <div className="w-14 h-14 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface mb-2">Something went wrong</h2>
          <p className="text-secondary text-sm mb-6 leading-relaxed">
            An unexpected error occurred rendering this section. Our team has been notified.
          </p>
          {this.state.error && (
            <pre className="text-left text-xs bg-surface-container-low border border-outline-variant p-4 rounded-lg overflow-auto max-h-40 font-mono mb-6 text-on-surface-variant">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-headline text-sm font-semibold rounded-lg transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reload Page</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
