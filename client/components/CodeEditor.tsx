"use client";

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-zinc-500 space-y-4 font-mono">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      <span>Initializing IDE...</span>
    </div>
  ),
});


interface CodeEditorProps {
  roomId: string; // Required for collaboration
  code: string;
  language: string;
  theme: string;
  onChange: (value: string | undefined) => void;
  onLanguageChange: (language: string) => void;
  onThemeChange: (theme: string) => void;
  onRun: () => void;
  onUserJoin?: (userName: string) => void;
  onUserLeave?: (userName: string) => void;
  isRunning?: boolean;
}

const LANGUAGES = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'C++', value: 'cpp' },
  { label: 'Java', value: 'java' },
];

const THEMES = [
  { label: 'VS Dark', value: 'vs-dark' },
  { label: 'VS Light', value: 'vs-light' },
  { label: 'HC Black', value: 'hc-black' },
];

const COLORS = [
  '#ff5f56', '#ffbd2e', '#27c93f', '#7f0df2', '#00d1ff', '#ff00ff', '#ffa500', '#00ff00', '#00ffff', '#ffff00'
];

/**
 * Advanced Monaco Code Editor with Yjs Realtime Collaboration & User Awareness.
 * Integrates:
 * - Collaborative Cursors
 * - Selection Highlights
 * - Random User Colors & Identity
 */
const CodeEditor: React.FC<CodeEditorProps> = ({ 
  roomId,
  code, 
  language, 
  theme,
  onChange, 
  onLanguageChange, 
  onThemeChange,
  onRun,
  onUserJoin,
  onUserLeave,
  isRunning = false
}) => {
  const editorRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
    };
  }, []);

  const handleEditorDidMount = async (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    try {
      const { MonacoBinding } = await import('y-monaco');
      const { getYjsSetup } = await import('@/lib/collaboration/yjsSetup');

      // 0. Register Keyboard Shortcut (Ctrl + Enter)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun();
      });

      // 1. Setup Yjs collaboration for the specific room
      const { provider, sharedText } = getYjsSetup(roomId);
      providerRef.current = provider;

      // 2. Setup Awareness (User Presence)
      const { getOrCreateUser } = await import('@/lib/userProfile');
      const userProfile = getOrCreateUser();
      
      if (userProfile) {
        provider.awareness.setLocalStateField('user', {
          name: userProfile.name,
          color: userProfile.color,
        });
        console.log(`[Presence] Identity: ${userProfile.name} | Color: ${userProfile.color} | ID: ${userProfile.id}`);
      } else {
        // Fallback for SSR/Errors
        provider.awareness.setLocalStateField('user', {
          name: 'Anonymous',
          color: '#888888',
        });
      }

      // 3. Setup Awareness Listeners for notifications
      provider.awareness.on('change', ({ added, updated, removed }: any) => {
        added.forEach((clientId: number) => {
          if (clientId !== provider.awareness.clientID) {
            const state = provider.awareness.getStates().get(clientId);
            const name = state?.user?.name || `Peer ${clientId}`;
            onUserJoin?.(name);
          }
        });
        removed.forEach((clientId: number) => {
          // Note: We can't get state after removal usually, but we can log that someone left
          onUserLeave?.(`A user (ID: ${clientId})`);
        });
      });



      // 4. Bind Monaco to Yjs with Awareness enabled for Cursors/Selections
      const binding = new MonacoBinding(
        sharedText,
        editor.getModel()!,
        new Set([editor]),
        provider.awareness
      );
      
      bindingRef.current = binding;
      console.log(`[Yjs] Collaboration locked in room: ${roomId}`);
    } catch (err) {
      console.error("[Yjs] Critical Initialization Error:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Language</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-zinc-800 text-zinc-100 text-xs px-2 py-1.5 rounded border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-500 appearance-none cursor-pointer min-w-[110px]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Theme</span>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="bg-zinc-800 text-zinc-100 text-xs px-2 py-1.5 rounded border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-500 appearance-none cursor-pointer min-w-[110px]"
            >
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRun}
            disabled={isRunning}
            className={`flex items-center gap-2 text-white text-xs font-bold px-4 py-1.5 rounded transition-colors active:scale-95 shadow-lg shadow-green-900/20 ${
              isRunning ? 'bg-zinc-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isRunning ? (
              <>
                <div className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
                Run Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full relative">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme={theme}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            lineNumbers: 'on',
            formatOnPaste: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            fontSize: 14,
            automaticLayout: true,
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* Global CSS for Remote Selection Styles */}
      <style jsx global>{`
        .yRemoteSelection {
          background-color: rgba(127, 13, 242, 0.3);
        }
        .yRemoteSelectionHead {
          position: absolute;
          border-left: orange solid 2px;
          border-top: orange solid 2px;
          border-bottom: orange solid 2px;
          height: 100%;
          box-sizing: border-box;
        }
        .yRemoteSelectionHead::after {
          position: absolute;
          content: attr(data-user-name);
          background-color: orange;
          color: white;
          padding: 2px 4px;
          border-radius: 2px;
          font-size: 10px;
          font-family: inherit;
          white-space: nowrap;
          top: -14px;
          left: -2px;
        }
      `}</style>
    </div>
  );
};

export default CodeEditor;
