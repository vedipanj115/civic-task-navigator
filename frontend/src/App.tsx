function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">Civic Task Navigator</h1>
        <p className="text-sm text-slate-500">
          Municipal bureaucracy path visualizer
        </p>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-slate-400">
          Flow canvas goes here.
        </p>
      </main>
    </div>
  )
}

export default App
