"use client";

import { useState, useEffect, useRef } from "react";
import CodeEditor from "@/components/CodeEditor";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Realtime Code Editor Page with Firestore Integration.
 * Features:
 * - Persistent storage in Firestore
 * - 2s Debounced auto-save
 * - Automatic load on mount
 * - Theme & Language switching
 */
export default function EditorPage() {
  const [code, setCode] = useState<string>("// Loading from cloud...");
  const [language, setLanguage] = useState<string>("javascript");
  const [theme, setTheme] = useState<string>("vs-dark");
  const [logs, setLogs] = useState<string[]>(["Connecting to HashHustlers Cloud..."]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  
  const ROOM_ID = "test-room";
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  // 1. Initial Load from Firestore
  useEffect(() => {
    const initSession = async () => {
      try {
        const docRef = doc(db, "documents", ROOM_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCode(data.code || "");
          setLanguage(data.language || "javascript");
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Session resumed from cloud.`]);
        } else {
          const defaultCode = `// Happy coding with HashHustlers\nconsole.log("Welcome to the platform!");`;
          setCode(defaultCode);
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] New session initialized.`]);
        }
      } catch (error: any) {
        console.error("Firestore Load Error:", error);
        setLogs(prev => [...prev, `[ERROR] Cloud connection failed: ${error.message}`]);
        setSyncStatus("error");
      } finally {
        isInitialLoad.current = false;
      }
    };

    initSession();
  }, []);

  // 2. Debounced Save to Firestore
  useEffect(() => {
    if (isInitialLoad.current) return;

    // Don't save if we are still in the default "Loading" state
    if (code === "// Loading from cloud...") return;

    setSyncStatus("syncing");
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, "documents", ROOM_ID), {
          roomId: ROOM_ID,
          code: code,
          language: language,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        setSyncStatus("saved");
        console.log("Sync Status: Success");
      } catch (error: any) {
        console.error("Firestore Save Error:", error);
        setSyncStatus("error");
      }
    }, 2000); // 2 second debounce

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [code, language]);

  // UI Handlers
  const handleRunCode = () => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[Run Code - ${language}]:`, code);
    setLogs((prev) => [
      ...prev,
      `[${timestamp}] Executing ${language}...`,
      `> Snapshot size: ${(new TextEncoder().encode(code).length / 1024).toFixed(2)} KB`,
      `> Logged to browser console.`,
    ]);
  };

  const handleCodeChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      setCode(newValue);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans overflow-hidden">
      {/* Top Navbar */}
      <nav className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-[#09090b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          </div>
          <h1 className="text-sm font-black tracking-tighter text-white uppercase italic">
            HASHHUSTLERS <span className="text-zinc-500 not-italic font-medium text-[10px] ml-1 tracking-widest uppercase">IDE</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
              {syncStatus === "syncing" ? "Syncing..." : syncStatus === "saved" ? "Cloud Saved" : syncStatus === "error" ? "Cloud Error" : "Standalone"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === "syncing" ? "bg-yellow-500 animate-pulse" : syncStatus === "saved" ? "bg-green-500" : syncStatus === "error" ? "bg-red-500 text-red-500" : "bg-zinc-700"}`} />
              <span className="text-[11px] font-mono text-zinc-500">ID: {ROOM_ID}</span>
            </div>
          </div>
          <button className="text-[11px] font-bold bg-white text-black px-5 py-1.5 rounded hover:bg-zinc-200 transition-all active:scale-95">
            Deploy
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden relative border-b border-zinc-800">
          <CodeEditor 
            code={code}
            language={language}
            theme={theme}
            onChange={handleCodeChange}
            onLanguageChange={setLanguage}
            onThemeChange={setTheme}
            onRun={handleRunCode}
          />
        </div>

        {/* Console Panel */}
        <div className="h-64 flex flex-col bg-black shrink-0 relative">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/80 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-900/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-900/50" />
                <div className="w-2 h-2 rounded-full bg-green-900/50" />
              </div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">System Output</span>
            </div>
            <button onClick={clearLogs} className="text-[10px] text-zinc-700 hover:text-white transition-colors uppercase font-black tracking-tighter">
              Clear Buffer
            </button>
          </div>
          <div className="flex-1 p-5 font-mono text-[11px] overflow-y-auto custom-scrollbar selection:bg-zinc-800">
            {logs.map((log, i) => (
              <div key={i} className={`mb-1.5 leading-relaxed flex items-start ${i === 0 && log.includes("Loading") ? "text-zinc-600" : "text-zinc-400"}`}>
                <span className="text-zinc-800 mr-4 select-none flex-shrink-0">{(i + 1).toString().padStart(2, '0')}</span>
                <span className="break-all whitespace-pre-wrap">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #18181b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #27272a; }
      `}</style>
    </div>
  );
}
