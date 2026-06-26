"use client"

import React, { useState, useEffect, useRef } from "react"
import { Play, Square, X, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

import { useSettings } from "@/hooks/use-settings"
import { cn } from "@/lib/utils"
import { useCodeRunner } from "@/contexts/code-runner-context"

const canInterrupt = typeof SharedArrayBuffer === "function"

export function CanvasPyInterpreter({ onClose }: { onClose?: () => void }) {
    const { settings } = useSettings()
    const { code: runRequestCode, commandTimestamp } = useCodeRunner()

    // Default code or load from somewhere if needed
    const [code, setCode] = useState(`# Python Interpreter
print("Hello from Pyodide!")
import sys
print(sys.version)
`)
    const [output, setOutput] = useState("")
    const [images, setImages] = useState<string[]>([])
    const [running, setRunning] = useState(false)
    const [worker, setWorker] = useState<Worker | null>(null)
    const [interruptBuffer, setInterruptBuffer] = useState<Uint8Array | null>(null)
    const workerRef = useRef<Worker | null>(null)

    // Listen for run requests
    useEffect(() => {
        if (commandTimestamp > 0 && runRequestCode) {
            setCode(runRequestCode)
        }
    }, [commandTimestamp, runRequestCode])

    // Initialize worker
    useEffect(() => {
        if (!settings.enablePythonInterpreter && !settings.tools.canvas) return

        const initWorker = () => {
            // Create worker from public file
            const myWorker = new Worker("/workers/pyodide-worker.js")
            workerRef.current = myWorker
            setWorker(myWorker)

            if (canInterrupt) {
                const buffer = new SharedArrayBuffer(1)
                setInterruptBuffer(new Uint8Array(buffer))
            }
        }

        initWorker()

        return () => {
            workerRef.current?.terminate()
        }
    }, [settings.enablePythonInterpreter, settings.tools.canvas])

    const runCode = async () => {
        if (!workerRef.current) return

        setRunning(true)
        setOutput("Loading Pyodide and running...")
        setImages([])

        const id = Math.random().toString(36).substring(7)

        // Reset interrupt buffer
        if (interruptBuffer) {
            interruptBuffer[0] = 0
        }

        workerRef.current.onmessage = (event) => {
            const { id: resultId, result, error, stdOutAndErr, running: isRunning, images: runImages } = event.data

            if (resultId !== id) return

            if (isRunning) {
                // Still running setup or execution started
                return
            }

            if (error) {
                setOutput((prev) => `Error:\n${error}`)
                setRunning(false)
            } else {
                const outputLog = stdOutAndErr ? stdOutAndErr.join("\n") : ""
                const finalResult = result !== undefined ? `\nResult: ${result}` : ""
                setOutput(`${outputLog}${finalResult}`)
                if (runImages && runImages.length > 0) {
                    setImages(runImages)
                }
                setRunning(false)
            }
        }

        workerRef.current.postMessage({
            id,
            python: code,
            context: {},
            interruptBuffer: interruptBuffer
        })
    }

    const stopCode = () => {
        if (interruptBuffer) {
            interruptBuffer[0] = 2 // 2 simulates SIGINT usually in Pyodide/Emscripten handling
            // If force terminate needed:
            // workerRef.current?.terminate()
            // ... restart worker
        } else {
            // Fallback for no SharedArrayBuffer: Terminate and restart
            workerRef.current?.terminate();
            setRunning(false);
            setOutput("Execution terminated (Worker restarted).");

            // Restart worker
            const myWorker = new Worker("/workers/pyodide-worker.js")
            workerRef.current = myWorker
            setWorker(myWorker)
        }
    }

    if (!settings.enablePythonInterpreter && !settings.tools.canvas) return null

    return (
        <div className="w-full h-full flex flex-col gap-4 overflow-hidden">
            <div className="h-1/2 min-h-[200px] flex flex-col relative">
                <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none p-4 leading-relaxed"
                    spellCheck={false}
                    placeholder="Enter Python code here..."
                />
            </div>

            <div className="h-1/2 min-h-[150px] flex flex-col border rounded-md bg-muted/30">
                <div className="flex items-center p-2 border-b bg-muted/50 gap-2">
                    <Button
                        size="sm"
                        onClick={runCode}
                        disabled={running}
                        className="h-7 text-xs"
                    >
                        <Play className="w-3 h-3 mr-1.5" />
                        Run
                    </Button>

                    {(running || canInterrupt) && (
                        <Button
                            size="icon"
                            variant="destructive"
                            onClick={stopCode}
                            disabled={!running}
                            className="h-7 w-7"
                            title="Stop"
                        >
                            <Square className="w-3 h-3 fill-current" />
                        </Button>
                    )}

                    <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                        Powered by Pyodide
                        <a href="https://pyodide.org/" target="_blank" rel="noreferrer" className="hover:text-foreground">
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 font-mono text-sm whitespace-pre-wrap flex flex-col gap-2">
                    {output ? (
                        <span className="text-foreground">{output}</span>
                    ) : (
                        <span className="text-muted-foreground italic">Output will appear here...</span>
                    )}
                    {images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Plot ${idx + 1}`} className="max-w-full h-auto rounded border bg-white p-1 my-2 self-center shadow-sm" />
                    ))}
                </div>
            </div>
        </div>
    )
}
