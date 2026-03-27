import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        if (this.state.error?.message) {
          errorDetails = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-brand-primary flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center border-4 border-red-50">
            <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-brand-navy mb-4">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              نواجه حالياً مشكلة تقنية في عرض هذه الصفحة. فريقنا يعمل على حلها.
            </p>

            {errorDetails && (
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-right font-mono text-xs overflow-auto max-h-40 border border-gray-100">
                <p className="text-red-600 font-bold mb-2">تفاصيل الخطأ:</p>
                <pre className="text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 bg-brand-navy text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-navy/90 transition-all"
              >
                <RefreshCcw className="w-5 h-5" />
                تحديث الصفحة
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-gray-100 text-brand-navy px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                <Home className="w-5 h-5" />
                العودة للرئيسية
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
