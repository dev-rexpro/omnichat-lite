"use client"

import React, { memo, useMemo, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import rehypeKatex from "rehype-katex"
import { Copy, Check, Play, Info, Lightbulb, Star, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Download } from "lucide-react"
import { useSettings } from "@/hooks/use-settings"
import { useCodeRunner } from "@/contexts/code-runner-context"
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useTheme } from "next-themes"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MermaidChart from "./mermaid-chart"

// --- Utility Functions ---

function escapeBrackets(text: string): string {
    if (typeof text !== 'string') return "";
    const pattern = /(```[\S\s]*?```|`.*?`)|\\\[([\S\s]*?[^\\])\\]|\\\((.*?)\\\)/g
    return text.replace(
        pattern,
        (match, codeBlock, squareBracket, roundBracket): string => {
            if (codeBlock != null) return codeBlock
            if (squareBracket != null) return `$$${squareBracket}$$`
            if (roundBracket != null) return `$${roundBracket}$`
            return match
        }
    )
}

function escapeMhchem(text: string) {
    return text.split('$\\ce{').join('$\\\\ce{').split('$\\pu{').join('$\\\\pu{');
}

export function preprocessLaTeX(content: string): string {
    if (typeof content !== 'string') {
        return "";
    }

    try {
        // Protect code blocks
        const codeBlocks: string[] = []
        let processed = content.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (_, code) => {
            codeBlocks.push(code)
            return `<<CODE_BLOCK_${codeBlocks.length - 1}>>`
        })

        // Protect LaTeX expressions
        const latexExpressions: string[] = []
        processed = processed.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g, (match) => {
            latexExpressions.push(match)
            return `<<LATEX_${latexExpressions.length - 1}>>`
        })

        // Protect inline math
        processed = processed.replace(/\$([^$]+)\$/g, (match, inner) => {
            if (/^\s*\d+(?:\.\d+)?\s*$/.test(inner)) return match
            latexExpressions.push(match)
            return `<<LATEX_${latexExpressions.length - 1}>>`
        })

        // Escape currency dollar signs
        processed = processed.replace(/\$(?=\d)/g, "\\$")

        // Restore
        processed = processed.replace(/<<LATEX_(\d+)>>/g, (_, index) => latexExpressions[parseInt(index)] || "")
        processed = processed.replace(/<<CODE_BLOCK_(\d+)>>/g, (_, index) => codeBlocks[parseInt(index)] || "")

        processed = escapeBrackets(processed)
        processed = escapeMhchem(processed)

        return processed
    } catch (e) {
        console.error("Error in preprocessLaTeX:", e)
        return content
    }
}

// --- Components ---

const RunCodeButton = ({ code }: { code: string }) => {
    const { settings } = useSettings()
    const { runCode } = useCodeRunner()

    if (!settings.enablePythonInterpreter && !settings.tools.canvas) return null

    return (
        <button
            onClick={() => runCode(code)}
            className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors font-medium border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 rounded hover:bg-green-500/20 animate-fade-in"
            title="Run in Python Interpreter"
        >
            <Play className="w-[10px] h-[10px] fill-current" />
            Run
        </button>
    )
}

const PreviewCodeButton = ({ code }: { code: string }) => {
    const { settings } = useSettings()
    const { runCode } = useCodeRunner()

    if (!settings.enablePythonInterpreter && !settings.tools.canvas) return null

    return (
        <button
            onClick={() => runCode(code, "html")}
            className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors font-medium border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded hover:bg-blue-500/20 animate-fade-in"
            title="Preview in Canvas"
        >
            <Play className="w-[10px] h-[10px] fill-current" />
            Preview
        </button>
    )
}

const CodeBlockContainer = ({ language, codeContent, style, ...props }: any) => {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(codeContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const extMap: Record<string, string> = {
            python: 'py', py: 'py',
            javascript: 'js', js: 'js',
            typescript: 'ts', ts: 'ts',
            html: 'html', css: 'css',
            json: 'json', markdown: 'md', md: 'md',
            bash: 'sh', sh: 'sh',
            rust: 'rs', go: 'go',
            cpp: 'cpp', c: 'c',
            java: 'java', sql: 'sql'
        }
        const ext = extMap[language.toLowerCase()] || 'txt'
        const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `code-snippet.${ext}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const lineCount = codeContent.split('\n').length

    return (
        <div className="rounded-md overflow-hidden my-4 border bg-background group/code relative transition-all duration-200">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b select-none">
                <span className="text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">{language}</span>
                <div className="flex items-center gap-3">
                    {language.toLowerCase() === 'python' && (
                        <RunCodeButton code={codeContent} />
                    )}
                    {language.toLowerCase() === 'html' && (
                        <PreviewCodeButton code={codeContent} />
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors font-sans cursor-pointer font-medium"
                        title={isCollapsed ? "Expand Code" : "Collapse Code"}
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronDown className="w-[14px] h-[14px]" />
                                <span>Expand ({lineCount} lines)</span>
                            </>
                        ) : (
                            <>
                                <ChevronUp className="w-[14px] h-[14px]" />
                                <span>Collapse</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer font-medium"
                        title="Download Code"
                    >
                        <Download className="w-[14px] h-[14px]" />
                        <span>Download</span>
                    </button>
                    <button
                        onClick={handleCopy}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer font-medium"
                    >
                        {copied ? <Check className="w-[14px] h-[14px] text-green-500" /> : <Copy className="w-[14px] h-[14px]" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>
            </div>
            {!isCollapsed ? (
                <div className="text-sm select-text">
                    <SyntaxHighlighter
                        {...props}
                        style={style}
                        language={language}
                        PreTag="div"
                        customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px' }}
                    >
                        {codeContent}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <div className="p-3 bg-muted/20 text-xs text-muted-foreground italic font-mono border-t select-none cursor-pointer hover:bg-muted/30 transition-all duration-150 flex items-center justify-between" onClick={() => setIsCollapsed(false)}>
                    <span>{"// Code block collapsed. Click to expand..."}</span>
                    <span className="text-[10px] text-muted-foreground/60">{lineCount} lines hidden</span>
                </div>
            )}
        </div>
    )
}

const TableWrapper = ({ children, ...props }: any) => {
    const [copied, setCopied] = useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const getTableData = () => {
        if (!containerRef.current) return { headers: [], rows: [] }
        
        const headers: string[] = []
        const rows: string[][] = []

        const ths = containerRef.current.querySelectorAll('th')
        ths.forEach(th => {
            headers.push(th.textContent || '')
        })

        const trs = containerRef.current.querySelectorAll('tbody tr')
        trs.forEach(tr => {
            const rowData: string[] = []
            tr.querySelectorAll('td').forEach(td => {
                rowData.push(td.textContent || '')
            })
            rows.push(rowData)
        })

        return { headers, rows }
    }

    const handleCopy = async () => {
        const { headers, rows } = getTableData()
        if (headers.length === 0 && rows.length === 0) return

        let markdownTable = ''
        if (headers.length > 0) {
            markdownTable += `| ${headers.map(h => h.trim().replace(/\n/g, ' ')).join(' | ')} |\n`
            markdownTable += `| ${headers.map(() => '---').join(' | ')} |\n`
        }
        rows.forEach(row => {
            markdownTable += `| ${row.map(r => r.trim().replace(/\n/g, ' ')).join(' | ')} |\n`
        })

        await navigator.clipboard.writeText(markdownTable.trim())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleExportCSV = () => {
        const { headers, rows } = getTableData()
        if (headers.length === 0 && rows.length === 0) return

        const escapeCSV = (text: string) => {
            const formatted = text.trim().replace(/\n/g, ' ')
            return `"${formatted.replace(/"/g, '""')}"`
        }

        const csvContent: string[] = []
        if (headers.length > 0) {
            csvContent.push(headers.map(escapeCSV).join(','))
        }
        rows.forEach(row => {
            csvContent.push(row.map(escapeCSV).join(','))
        })

        const bom = '\uFEFF'
        const blob = new Blob([bom + csvContent.join('\n')], { type: 'text/csv;charset=UTF-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `table-export-${new Date().getTime()}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <div ref={containerRef} className="not-prose mb-4 mt-0 overflow-hidden rounded-md border group relative transition-all duration-200">
            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-md border shadow-sm select-none">
                <button
                    onClick={handleCopy}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Copy Markdown Table"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                    onClick={handleExportCSV}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Export to CSV"
                >
                    <Download className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="overflow-x-auto max-w-full">
                <Table className="!mt-0">
                    {children}
                </Table>
            </div>
        </div>
    )
}

function findAlertHeader(node: React.ReactNode): { type: string; cleanFirstText: string } | null {
    if (typeof node === 'string') {
        const match = node.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*[\r\n]*/i)
        if (match) {
            return {
                type: match[1].toUpperCase(),
                cleanFirstText: node.substring(match[0].length)
            }
        }
    }
    if (React.isValidElement(node)) {
        const element = node as React.ReactElement<any>
        if (element.props && element.props.children) {
            const childrenArray = React.Children.toArray(element.props.children)
            if (childrenArray.length > 0) {
                const res = findAlertHeader(childrenArray[0])
                if (res) {
                    return res
                }
            }
        }
    }
    return null
}

function removeAlertHeader(node: React.ReactNode, cleanText: string): React.ReactNode {
    if (typeof node === 'string') {
        return cleanText
    }
    if (React.isValidElement(node)) {
        const element = node as React.ReactElement<any>
        if (element.props && element.props.children) {
            const childrenArray = React.Children.toArray(element.props.children)
            if (childrenArray.length > 0) {
                const firstChildModified = removeAlertHeader(childrenArray[0], cleanText)
                const restChildren = childrenArray.slice(1)
                return React.cloneElement(element, {}, firstChildModified, ...restChildren)
            }
        }
    }
    return node
}

const BlockquoteAlert = ({ children, ...props }: { children: React.ReactNode }) => {
    const headerInfo = findAlertHeader(children)
    
    if (headerInfo) {
        const { type, cleanFirstText } = headerInfo
        const cleanChildren = removeAlertHeader(children, cleanFirstText)
        
        let alertStyles = ""
        let icon: React.ReactNode = null
        
        switch (type) {
            case 'NOTE':
                alertStyles = "border-sky-500 bg-sky-500/5 text-sky-850 dark:text-sky-300"
                icon = <Info className="w-4 h-4 text-sky-500" />
                break;
            case 'TIP':
                alertStyles = "border-emerald-500 bg-emerald-500/5 text-emerald-850 dark:text-emerald-300"
                icon = <Lightbulb className="w-4 h-4 text-emerald-500 animate-pulse" />
                break;
            case 'IMPORTANT':
                alertStyles = "border-purple-500 bg-purple-500/5 text-purple-850 dark:text-purple-300"
                icon = <Star className="w-4 h-4 text-purple-500" />
                break;
            case 'WARNING':
                alertStyles = "border-amber-500 bg-amber-500/5 text-amber-900 dark:text-amber-300"
                icon = <AlertTriangle className="w-4 h-4 text-amber-500" />
                break;
            case 'CAUTION':
                alertStyles = "border-rose-500 bg-rose-500/5 text-rose-850 dark:text-rose-300"
                icon = <ShieldAlert className="w-4 h-4 text-rose-500" />
                break;
        }
        
        return (
            <div className={cn("border-l-4 pl-4 py-2.5 my-4 rounded-r-md select-text transition-all duration-250 shadow-sm", alertStyles)} {...props}>
                <div className="flex items-center gap-1.5 mb-1.5 select-none font-bold text-xs uppercase tracking-wider">
                    {icon}
                    <span>{type}</span>
                </div>
                <div className="prose-p:my-1 text-sm leading-relaxed">
                    {cleanChildren}
                </div>
            </div>
        )
    }
    
    return (
        <blockquote className="border-l-3 border-border pl-4 text-muted-foreground my-2 italic" {...props}>
            {children}
        </blockquote>
    )
}

const MarkdownDisplay = memo(function MarkdownDisplay({ content }: { content: any }) {
    const safeContent = typeof content === 'string' ? content : String(content || "")
    const brNormalized = safeContent.replace(/<\s*br\s*\/?>/gi, '\n')
    const preprocessedContent = useMemo(() => preprocessLaTeX(brNormalized), [brNormalized])
    const { resolvedTheme } = useTheme()
    const [style, setStyle] = useState<any>(vscDarkPlus)

    React.useEffect(() => {
        setStyle(resolvedTheme === 'dark' ? vscDarkPlus : vs)
    }, [resolvedTheme])

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none select-text">
            <Markdown
                remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    table: ({ node, children, ...props }) => (
                        <TableWrapper {...props}>{children}</TableWrapper>
                    ),
                    thead: ({ node, ...props }) => <TableHeader {...props} />,
                    tbody: ({ node, ...props }) => <TableBody {...props} />,
                    tr: ({ node, ...props }) => <TableRow {...props} />,
                    th: ({ node, ...props }) => <TableHead className="whitespace-normal h-auto py-2 align-top" {...props} />,
                    td: ({ node, ...props }) => <TableCell className="whitespace-normal align-top" {...props} />,
                    blockquote: ({ node, children, ...props }) => (
                        <BlockquoteAlert {...props}>{children}</BlockquoteAlert>
                    ),
                    a: ({ node, ...props }) => (
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity font-medium"
                            {...props}
                        />
                    ),
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeContent = String(children).replace(/\n$/, '')
                        const language = match ? match[1] : ''

                        if (!inline && match) {
                            if (language.toLowerCase() === "mermaid") {
                                return <MermaidChart code={codeContent} />
                            }
                            return (
                                <CodeBlockContainer
                                    {...props}
                                    language={language}
                                    codeContent={codeContent}
                                    style={style}
                                />
                            )
                        }
                        return (
                            <code {...props} className={cn(className, "bg-accent/50 px-1.5 py-0.5 rounded text-sm")}>
                                {children}
                            </code>
                        )
                    }
                }}
            >
                {preprocessedContent}
            </Markdown>
        </div>
    )
})

export default MarkdownDisplay
