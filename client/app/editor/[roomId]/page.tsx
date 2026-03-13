"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Realtime Dynamic Collaborative Editor Page.
 * Routes: /editor/[roomId]
 */
export default function EditorPage() {
  const params = useParams();
  const roomId = params?.roomId as string || "default-room";

  const [code, setCode] = useState<string>("// Connecting to room " + roomId + "...");
  const [language, setLanguage] = useState<string>("javascript");
  const [theme, setTheme] = useState<string>("vs-dark");
  const [logs, setLogs] = useState<string[]>(["Initializing workspace..."]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  // 1. Initial Load from Firestore
  useEffect(() => {
    const initSession = async () => {
      if (!roomId) return;
      
      try {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Accessing room: ${roomId}`]);
        const docRef = doc(db, "documents", roomId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCode(data.code || "");
          setLanguage(data.language || "javascript");
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Cloud state restored.`]);
        } else {
          const defaultCode = `// Collaborative Room: ${roomId}\nconsole.log("Welcome to HashHustlers!");`;
          setCode(defaultCode);
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] New room document created.`]);
        }
      } catch (error: any) {
        console.error("Firestore Error:", error);
        setLogs(prev => [...prev, `[ERROR] Connection failed: ${error.message}`]);
        setSyncStatus("error");
      } finally {
        isInitialLoad.current = false;
      }
    };

    initSession();
  }, [roomId]);

  // 2. Debounced Save to Firestore
  useEffect(() => {
    if (isInitialLoad.current || !roomId) return;

    // Don't save if we are still in the fallback content
    if (code.startsWith("// Connecting to room")) return;

    setSyncStatus("syncing");
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, "documents", roomId), {
          roomId: roomId,
          code: code,
          language: language,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        setSyncStatus("saved");
      } catch (error: any) {
        console.error("Sync Error:", error);
        setSyncStatus("error");
      }
    }, 2000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [code, language, roomId]);

  const handleRunCode = () => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      `[${timestamp}] Executing in room ${roomId}...`,
      `> Language: ${language}`,
      `> Result: Logged to browser console.`,
    ]);
  };

  const handleCodeChange = (newValue: string | undefined) => {
    if (newValue !== undefined) setCode(newValue);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans overflow-hidden">
      {/* Dynamic Navbar */}
      <nav className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-[#09090b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          </div>
          <div className="flex flex-col">
             <h1 className="text-sm font-black tracking-tighter text-white uppercase italic leading-tight">
              HASHHUSTLERS
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">
              ROOM: {roomId.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
              {syncStatus.toUpperCase()}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' : syncStatus === 'saved' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-mono text-zinc-600">CLOUD SYNC</span>
            </div>
          </div>
          <button className="text-[11px] font-bold bg-white text-black px-5 py-1.5 rounded hover:bg-zinc-200 transition-all active:scale-95">
            INVITE
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden relative border-b border-zinc-800">
          {/* Pass the dynamic roomId to CodeEditor for Yjs separation */}
          <CodeEditor 
            roomId={roomId}
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Workspace Logs</span>
            </div>
            <button onClick={() => setLogs([])} className="text-[10px] text-zinc-700 hover:text-white transition-colors uppercase font-black tracking-tighter">
              Clear
            </button>
          </div>
          <div className="flex-1 p-5 font-mono text-[11px] overflow-y-auto custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="mb-1.5 text-zinc-400">
                <span className="text-zinc-800 mr-4 select-none">{(i + 1).toString().padStart(2, '0')}</span>
                <span className="break-all whitespace-pre-wrap">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #18181b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
