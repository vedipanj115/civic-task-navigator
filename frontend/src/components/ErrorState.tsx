// docs/07-DESIGN-SYSTEM.md: ErrorState shows the message and, when known, the ApiErrorCode.
type Props = { message: string; code?: string; onRetry: () => void }

export function ErrorState({ message, code, onRetry }: Props) {
  return (
    <div role="alert" className="m-auto w-full max-w-sm rounded-lg border border-ink-200 bg-white p-5 shadow-card">
      <h2 className="font-semibold text-danger-700">Something went wrong</h2>
      <p className="mt-1 text-sm text-ink-700">{message}</p>
      {code && <p className="mt-2 font-mono text-xs text-ink-500">{code}</p>}
      <button
        onClick={onRetry}
        className="mt-4 rounded-md border border-ink-300 px-3 py-1.5 text-sm font-medium hover:bg-ink-100"
      >
        Try again
      </button>
    </div>
  )
}
