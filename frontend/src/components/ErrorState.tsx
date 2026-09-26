// docs/07-DESIGN-SYSTEM.md: ErrorState shows the message and, when known, the ApiErrorCode.
type Props = { message: string; code?: string; onRetry: () => void }

export function ErrorState({ message, code, onRetry }: Props) {
  return (
    <div role="alert" className="m-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-red-700">Something went wrong</h2>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      {code && <p className="mt-2 font-mono text-xs text-slate-400">{code}</p>}
      <button
        onClick={onRetry}
        className="mt-4 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
      >
        Try again
      </button>
    </div>
  )
}
