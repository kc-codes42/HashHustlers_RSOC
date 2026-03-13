"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { getOrCreateUser, UserProfile } from "@/lib/userProfile";
import Link from "next/link";

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
  interface LogEntry {
    type: 'info' | 'stdout' | 'stderr' | 'status' | 'running';
    content: string;
    timestamp: string;
  }

  const [logs, setLogs] = useState<LogEntry[]>([{ 
    type: 'info', 
    content: "Initializing workspace...", 
    timestamp: new Date().toLocaleTimeString() 
  }]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  const [isRunning, setIsRunning] = useState(false);
  
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  const sharedLogsRef = useRef<any>(null);
  const sharedStateRef = useRef<any>(null);

  // 1. Room Validation & Initial Document Load
  useEffect(() => {
    const initSession = async () => {
      if (!roomId) return;
      
      try {
        const { getYjsSetup } = await import('@/lib/collaboration/yjsSetup');
        const { sharedLogs, sharedState, provider } = getYjsSetup(roomId);
        if (sharedLogs) {
          sharedLogsRef.current = sharedLogs;
          sharedStateRef.current = sharedState;

          // Sync Shared Logs to Local State
          const syncLogs = () => {
            const allLogs = sharedLogs.toArray() as (LogEntry | LogEntry[])[];
            const flattened = allLogs.flat();
            setLogs(flattened as LogEntry[]);
          };

          // Sync Shared Execution State
          const syncState = () => {
            if (sharedState) {
              const running = sharedState.get("isRunning");
              setIsRunning(!!running);
            }
          };

          sharedLogs.observe(syncLogs);
          if (sharedState) {
            sharedState.observe(syncState);
          }
          syncLogs(); // Initial sync
          syncState(); // Initial sync
        }

        setLogs(prev => [...prev, { 
          type: 'info', 
          content: `Validating workspace: ${roomId}`, 
          timestamp: new Date().toLocaleTimeString() 
        }]);
        
        // A. Validate Room Existence
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (!roomSnap.exists()) {
          setRoomExists(false);
          setLogs(prev => [...prev, { 
            type: 'stderr', 
            content: `FATAL: Room ${roomId} not found in database.`, 
            timestamp: new Date().toLocaleTimeString() 
          }]);
          return;
        }
        
        setRoomExists(true);

        // B. Load Document Content
        const docRef = doc(db, "documents", roomId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCode(data.code || "");
          setLanguage(data.language || "javascript");
          setLogs(prev => [...prev, { 
            type: 'info', 
            content: "Cloud state restored successfully.", 
            timestamp: new Date().toLocaleTimeString() 
          }]);
        } else {
          setCode(`// Start coding in room: ${roomId}\nconsole.log("Hello HashHustlers!");`);
        }
      } catch (error: any) {
        console.error("Initialization Error:", error);
        setSyncStatus("error");
      } finally {
        isInitialLoad.current = false;
      }
    };

    initSession();
  }, [roomId]);

  // 2. Participant Join/Leave Management
  useEffect(() => {
    if (roomExists !== true) return;
    
    const userProfile = getOrCreateUser();
    if (!userProfile) return;

    const roomRef = doc(db, "rooms", roomId);

    // Join logic
    const joinRoomProfile = async () => {
      await updateDoc(roomRef, {
        participants: arrayUnion(userProfile)
      });
      setLogs(prev => [...prev, { 
        type: 'info', 
        content: `User connected: ${userProfile.name}`, 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    };

    // Leave logic
    const leaveRoomProfile = () => {
      updateDoc(roomRef, {
        participants: arrayRemove(userProfile)
      });
    };

    joinRoomProfile();

    // Browser-level cleanup (Tab closure)
    const handleBeforeUnload = () => leaveRoomProfile();
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Live Snapshot Listener
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        setParticipants(doc.data().participants || []);
      }
    });

    return () => {
      leaveRoomProfile();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unsubscribe();
    };
  }, [roomId, roomExists]);

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

  const handleRunCode = async () => {
    if (isRunning || !sharedLogsRef.current || !sharedStateRef.current) return;
    
    const timestamp = new Date().toLocaleTimeString();
    sharedStateRef.current.set("isRunning", true);
    
    const initialLog: LogEntry = { 
      type: 'running', 
      content: `Compiling & Executing ${language.toUpperCase()} code...`, 
      timestamp 
    };
    sharedLogsRef.current.push([initialLog]);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code })
      });

      const result = await response.json();
      const endTimestamp = new Date().toLocaleTimeString();
      const resultsToPush: LogEntry[] = [];

      if (result.stdout) {
        resultsToPush.push({ type: 'stdout', content: result.stdout, timestamp: endTimestamp });
      }
      
      if (result.stderr) {
        resultsToPush.push({ type: 'stderr', content: result.stderr, timestamp: endTimestamp });
      }

      if (result.compile_output) {
        resultsToPush.push({ type: 'stderr', content: result.compile_output, timestamp: endTimestamp });
      }

      resultsToPush.push({ 
        type: 'status', 
        content: `Exited with status: ${result.status}`, 
        timestamp: endTimestamp 
      });

      sharedLogsRef.current.push(resultsToPush);

      // Save execution to Firestore
      const userProfile = getOrCreateUser();
      try {
        await addDoc(collection(db, "executions"), {
          roomId,
          language,
          code,
          stdout: result.stdout || "",
          stderr: (result.stderr || "") + (result.compile_output || ""),
          status: result.status || "Unknown",
          timestamp: serverTimestamp(),
          userId: userProfile?.id || "anonymous"
        });
      } catch (fsError) {
        console.error("Failed to save execution to Firestore:", fsError);
      }

    } catch (error: any) {
      sharedLogsRef.current.push([{ 
        type: 'stderr', 
        content: `Network Error: Could not connect to execution server.`, 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } finally {
      if (sharedStateRef.current) {
        sharedStateRef.current.set("isRunning", false);
      }
    }
  };

  const handleCodeChange = (newValue: string | undefined) => {
    if (newValue !== undefined) setCode(newValue);
  };

  // LOADING STATE
  if (roomExists === null) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-zinc-500 font-mono">
        <div className="w-12 h-12 border-4 border-zinc-900 border-t-white rounded-full animate-spin mb-4" />
        <span className="uppercase tracking-widest text-xs font-bold">Connecting to Cloud...</span>
      </div>
    );
  }

  // NOT FOUND STATE
  if (roomExists === false) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-950/30 rounded-full flex items-center justify-center mb-8 border border-red-900/50">
           <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white mb-2">Room Not Found</h2>
        <p className="text-zinc-500 max-w-sm mb-10 text-sm leading-relaxed">
          The collaborative workspace you are looking for at <span className="text-zinc-300 font-mono">[{roomId}]</span> doesn't exist or has been archived.
        </p>
        <Link 
          href="/"
          className="bg-white text-black font-black uppercase tracking-tighter px-8 py-3 rounded-lg hover:bg-zinc-200 transition-all active:scale-95"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans overflow-hidden">
      {/* Dynamic Navbar */}
      <nav className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-[#09090b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center transition-transform hover:rotate-12">
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
          {/* Participant Badges */}
          <div className="flex items-center -space-x-2 mr-2">
            {participants.slice(0, 5).map((p, idx) => (
              <div 
                key={p.id} 
                title={p.name}
                className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-lg shadow-black/50"
                style={{ backgroundColor: p.color }}
              >
                {p.name.charAt(0) || 'U'}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[8px] font-black text-zinc-400">
                +{participants.length - 5}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
              {syncStatus.toUpperCase()}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse`} />
              <span className="text-[10px] font-mono text-zinc-600">COLLAB ACTIVE</span>
            </div>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
            }}
            className="text-[11px] font-bold bg-white text-black px-5 py-1.5 rounded hover:bg-zinc-200 transition-all active:scale-95"
          >
            SHARE
          </button>
        </div>
      </nav>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white text-black px-4 py-2 rounded-lg shadow-2xl flex items-center gap-3">
            <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center text-[8px] text-white">✓</div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Invite link copied to clipboard</span>
          </div>
        </div>
      )}

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
            isRunning={isRunning}
          />
        </div>

        {/* Console Panel */}
        <div className="h-64 flex flex-col bg-black shrink-0 relative border-t border-zinc-900">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-zinc-900/50">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Terminal Output</span>
              {isRunning && (
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-yellow-500 rounded-full animate-ping" />
                  <span className="text-[9px] text-yellow-600 font-bold uppercase tracking-tighter">Running</span>
                </div>
              )}
            </div>
            <button onClick={() => {
              if (sharedLogsRef.current) {
                sharedLogsRef.current.delete(0, sharedLogsRef.current.length);
              }
            }} className="text-[10px] text-zinc-700 hover:text-white transition-colors uppercase font-black tracking-tighter">
              Flush Console
            </button>
          </div>
          <div className="flex-1 p-5 font-mono text-[12px] overflow-y-auto custom-scrollbar selection:bg-zinc-800 bg-[#0c0c0d]">
            {logs.map((log, i) => (
              <div key={i} className="mb-2 group flex items-start gap-4">
                <span className="text-zinc-800 text-[10px] w-6 shrink-0 select-none mt-0.5">{(i + 1).toString().padStart(2, '0')}</span>
                <div className={`flex-1 break-all whitespace-pre-wrap leading-relaxed ${
                  log.type === 'stdout' ? 'text-zinc-100' : 
                  log.type === 'stderr' ? 'text-red-400 font-bold' : 
                  log.type === 'status' ? 'text-zinc-600 italic' : 
                  log.type === 'running' ? 'text-yellow-500 font-bold italic' :
                  'text-zinc-500'
                }`}>
                  {log.content}
                </div>
                <span className="opacity-0 group-hover:opacity-100 text-[9px] text-zinc-800 select-none transition-opacity uppercase font-bold">
                  {log.timestamp}
                </span>
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-zinc-700 px-10 text-[10px] italic">
                <span className="animate-pulse">Waiting for remote result...</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #09090b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #18181b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #27272a; }
      `}</style>
    </div>
  );
}
