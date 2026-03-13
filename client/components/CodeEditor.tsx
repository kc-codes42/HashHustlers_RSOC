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

/**
 * Advanced Monaco Code Editor with Yjs Realtime Collaboration.
 * SSR Fix: Libraries that depend on 'window' are imported dynamically.
 */
const CodeEditor: React.FC<CodeEditorProps> = ({ 
  roomId,
  code, 
  language, 
  theme,
  onChange, 
  onLanguageChange, 
  onThemeChange,
  onRun 
}) => {
  const editorRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);

  // Handle cleanup of collaboration instances
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  }, []);

  const handleEditorDidMount = async (editor: any) => {
    editorRef.current = editor;
    
    // SSR SAFE: Dynamically importing browser-only libraries inside mount handler
    try {
      const { MonacoBinding } = await import('y-monaco');
      const { getYjsSetup } = await import('@/lib/collaboration/yjsSetup');

      // 1. Setup Yjs collaboration for the specific room
      const { provider, sharedText } = getYjsSetup(roomId);
      providerRef.current = provider;

      // 2. Bind Monaco editor model to the Yjs shared text
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
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded transition-colors active:scale-95 shadow-lg shadow-green-900/20"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
            Run Code
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
    </div>
  );
};

export default CodeEditor;
