"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getOrCreateUser } from "@/lib/userProfile";

/**
 * HashHustlers Collaborative Editor Landing Page
 * Enhanced with Firestore Room Management
 */
export default function LandingPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Create Room Flow
  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const newRoomId = uuidv4();
      const userProfile = getOrCreateUser();
      const ownerId = userProfile?.id || "anonymous";
      
      // Create document in "rooms" collection
      await setDoc(doc(db, "rooms", newRoomId), {
        roomId: newRoomId,
        createdAt: serverTimestamp(),
        owner: ownerId,
        language: "javascript",
        participants: [],
      });

      // Also initialize a "documents" entry for the default code/code persistence
      // (Optional, but good for keeping state consistent)
      await setDoc(doc(db, "documents", newRoomId), {
        roomId: newRoomId,
        code: "// Start coding together...",
        language: "javascript",
        updatedAt: serverTimestamp(),
      });

      router.push(`/editor/${newRoomId}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      alert("Error creating room. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Join Room Flow
  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!roomId.trim()) {
      alert("Please enter a valid Room ID.");
      return;
    }
    
    router.push(`/editor/${roomId.trim()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 font-sans selection:bg-zinc-800">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-zinc-900/20 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 flex flex-col items-center max-w-lg w-full text-center space-y-12">
        {/* Branding */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10 group animate-in fade-in zoom-in duration-700">
            <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic sm:text-5xl leading-none">
              HASHHUSTLERS <span className="text-zinc-600">IDE</span>
            </h1>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-[0.3em] font-mono">
              Realtime Collaborative Code Editor
            </p>
          </div>
        </div>

        {/* Interaction Panel */}
        <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {!isJoining ? (
            <div className="flex flex-col gap-4">
              <button
                disabled={loading}
                onClick={handleCreateRoom}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-tighter rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg shadow-white/5 disabled:opacity-50"
              >
                {loading ? "Initializing Room..." : "Create New Room"}
              </button>
              <button
                disabled={loading}
                onClick={() => setIsJoining(true)}
                className="w-full py-4 bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold uppercase tracking-tighter rounded-xl hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Join with ID
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div className="flex flex-col items-center gap-2">
                <label className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-600">Enter Room ID</label>
                <div className="relative w-full group">
                  <input
                    autoFocus
                    type="text"
                    placeholder="E.G. 550E8400-E29B-41D4-A716-446655440000"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-6 py-4 rounded-xl text-center font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all placeholder:text-zinc-800 placeholder:text-xs uppercase"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsJoining(false); setRoomId(""); }}
                  className="flex-1 py-3 bg-zinc-900/50 text-zinc-600 font-bold uppercase tracking-tighter rounded-lg hover:text-zinc-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!roomId.trim()}
                  className="flex-[2] py-3 bg-white text-black font-black uppercase tracking-tighter rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest font-mono">
          Cloud Metadata Enabled • Firestore Bound
        </p>
      </main>
    </div>
  );
}
