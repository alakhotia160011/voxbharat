import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
          <p className="font-display text-earth text-xl font-bold mb-2">Something went wrong</p>
          <p className="font-body text-earth-mid text-sm mb-4">An unexpected error occurred.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-saffron text-white rounded-full text-sm font-body hover:bg-saffron/90 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
