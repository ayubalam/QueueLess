export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold text-lg">
          QL
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">QueueLess</h1>
          <p className="text-sm text-slate-400">Smart Queue Management System</p>
        </div>
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 text-left text-xs font-mono space-y-2 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Frontend:</span>
            <span className="text-emerald-400 font-semibold">React + Vite + TS</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Styling:</span>
            <span className="text-blue-400 font-semibold">Tailwind CSS + shadcn</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="text-amber-400 font-semibold">Architecture Initialized</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
