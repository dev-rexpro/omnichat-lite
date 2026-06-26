"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Trash2, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface FunctionCallingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialCode?: string
    onSave?: (code: string) => void
}

interface Property {
    id: string
    name: string
    type: string
    description: string
    required: boolean
    isArray: boolean
}

interface FunctionData {
    id: string
    name: string
    description: string
    properties: Property[]
}

const generateId = () => Math.random().toString(36).substr(2, 9)

export function FunctionCallingDialog({
    open,
    onOpenChange,
    initialCode = "[]",
    onSave
}: FunctionCallingDialogProps) {
    const [code, setCode] = React.useState(initialCode)
    const [activeTab, setActiveTab] = React.useState("code")
    const [functions, setFunctions] = React.useState<FunctionData[]>([])

    // Sync state when dialog opens
    React.useEffect(() => {
        if (open) {
            setCode(initialCode || "[]")
        }
    }, [open, initialCode])

    // Parse code to visual state
    const parseCodeToVisual = (jsonCode: string) => {
        try {
            const parsed = JSON.parse(jsonCode)
            if (!Array.isArray(parsed)) return []

            return parsed.map((fn: any) => ({
                id: generateId(),
                name: fn.name || "",
                description: fn.description || "",
                properties: fn.parameters?.properties
                    ? Object.entries(fn.parameters.properties).map(([key, val]: [string, any]) => ({
                        id: generateId(),
                        name: key,
                        type: val.type === "array" ? val.items?.type || "string" : val.type || "string",
                        description: val.description || "",
                        required: fn.parameters.required?.includes(key) || false,
                        isArray: val.type === "array"
                    }))
                    : []
            }))
        } catch (e) {
            return []
        }
    }

    // Serialize visual state to code
    const serializeVisualToCode = (funcs: FunctionData[]) => {
        const output = funcs.map(fn => {
            const properties: Record<string, any> = {}
            const required: string[] = []

            fn.properties.forEach(prop => {
                if (prop.name) {
                    if (prop.isArray) {
                        properties[prop.name] = {
                            type: "array",
                            items: { type: prop.type },
                            description: prop.description
                        }
                    } else {
                        properties[prop.name] = {
                            type: prop.type,
                            description: prop.description
                        }
                    }
                    if (prop.required) {
                        required.push(prop.name)
                    }
                }
            })

            return {
                name: fn.name,
                description: fn.description,
                parameters: {
                    type: "object",
                    properties,
                    required: required.length > 0 ? required : undefined
                }
            }
        })
        return JSON.stringify(output, null, 2)
    }

    // Handle Tab Change
    const handleTabChange = (value: string) => {
        if (value === "visual") {
            // Try to parse current code to populate visual editor
            try {
                const parsed = parseCodeToVisual(code)
                // Only update if parse successful or empty (to avoid losing work on invalid JSON)
                // If invalid, maybe show warning or stay in code?
                // For now we just populate what we can.
                setFunctions(parsed)
            } catch (e) {
                // failed to parse
            }
        } else {
            // Switch back to code: serialize what we have in visual
            setCode(serializeVisualToCode(functions))
        }
        setActiveTab(value)
    }

    const handleSave = () => {
        let finalCode = code
        // If currently in visual tab, serialize first
        if (activeTab === "visual") {
            finalCode = serializeVisualToCode(functions)
        }

        // Validate JSON before saving
        try {
            if (finalCode.trim()) {
                JSON.parse(finalCode)
            }
            onSave?.(finalCode)
            onOpenChange(false)
        } catch (e) {
            alert("Invalid JSON format")
        }
    }

    // Visual Editor Handlers
    const addFunction = () => {
        setFunctions([...functions, {
            id: generateId(),
            name: "",
            description: "",
            properties: []
        }])
    }

    const removeFunction = (id: string) => {
        setFunctions(functions.filter(f => f.id !== id))
    }

    const updateFunction = (id: string, field: keyof FunctionData, value: any) => {
        setFunctions(functions.map(f => f.id === id ? { ...f, [field]: value } : f))
    }

    const addProperty = (fnId: string) => {
        setFunctions(functions.map(f => {
            if (f.id !== fnId) return f
            return {
                ...f,
                properties: [...f.properties, {
                    id: generateId(),
                    name: "",
                    type: "string",
                    description: "",
                    required: false,
                    isArray: false
                }]
            }
        }))
    }

    const removeProperty = (fnId: string, propId: string) => {
        setFunctions(functions.map(f => {
            if (f.id !== fnId) return f
            return {
                ...f,
                properties: f.properties.filter(p => p.id !== propId)
            }
        }))
    }

    const updateProperty = (fnId: string, propId: string, field: keyof Property, value: any) => {
        setFunctions(functions.map(f => {
            if (f.id !== fnId) return f
            return {
                ...f,
                properties: f.properties.map(p => p.id === propId ? { ...p, [field]: value } : p)
            }
        }))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Function declarations</DialogTitle>
                    <DialogDescription>
                        Enter a list of function declarations for the model to call upon. See the API documentation for examples.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                        <div className="px-6 py-2 border-b bg-muted/40">
                            <TabsList className="grid w-[240px] grid-cols-2">
                                <TabsTrigger value="code">Code Editor</TabsTrigger>
                                <TabsTrigger value="visual">Visual Editor</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="code" className="flex-1 p-0 m-0 relative h-full">
                            <textarea
                                className="w-full h-full p-6 font-mono text-sm bg-background resize-none focus:outline-none"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="[\n  {\n    'name': 'get_weather',\n    ...\n  }\n]"
                                spellCheck={false}
                            />
                        </TabsContent>

                        <TabsContent value="visual" className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 overflow-y-auto min-h-0 max-h-[60vh]">
                                <div className="p-6 flex flex-col gap-8">
                                    {functions.map((fn) => (
                                        <div key={fn.id} className="flex flex-col gap-4 border-b pb-8 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <div className="text-xs font-medium text-muted-foreground">Name</div>
                                                        <Input
                                                            value={fn.name}
                                                            onChange={e => updateFunction(fn.id, 'name', e.target.value)}
                                                            placeholder="function_name"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="text-xs font-medium text-muted-foreground">Description</div>
                                                        <Input
                                                            value={fn.description}
                                                            onChange={e => updateFunction(fn.id, 'description', e.target.value)}
                                                            placeholder="Description of the function..."
                                                        />
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="mt-6 text-muted-foreground hover:text-destructive" onClick={() => removeFunction(fn.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="pl-4 border-l-2 border-muted space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-muted-foreground">Properties</span>
                                                </div>

                                                {fn.properties.map((prop) => (
                                                    <div key={prop.id} className="flex items-center gap-3">
                                                        <Input
                                                            className="flex-1 min-w-[150px]"
                                                            value={prop.name}
                                                            onChange={e => updateProperty(fn.id, prop.id, 'name', e.target.value)}
                                                            placeholder="parameter_name"
                                                        />
                                                        <Select
                                                            value={prop.type}
                                                            onValueChange={val => updateProperty(fn.id, prop.id, 'type', val)}
                                                        >
                                                            <SelectTrigger className="w-[120px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="string">string</SelectItem>
                                                                <SelectItem value="number">number</SelectItem>
                                                                <SelectItem value="boolean">boolean</SelectItem>
                                                                <SelectItem value="object">object</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <div className="flex items-center gap-2" title="Is Array?">
                                                            <span className="text-xs text-muted-foreground font-mono">[]</span>
                                                            <Checkbox
                                                                checked={prop.isArray}
                                                                onCheckedChange={val => updateProperty(fn.id, prop.id, 'isArray', val === true)}
                                                            />
                                                        </div>

                                                        <div className="flex items-center gap-2" title="Required?">
                                                            <span className="text-xs text-muted-foreground font-mono">*</span>
                                                            <Checkbox
                                                                checked={prop.required}
                                                                onCheckedChange={val => updateProperty(fn.id, prop.id, 'required', val === true)}
                                                            />
                                                        </div>

                                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => removeProperty(fn.id, prop.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}

                                                <Button variant="ghost" size="sm" className="h-8 gap-2 text-primary" onClick={() => addProperty(fn.id)}>
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add property
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <Button variant="ghost" className="w-full h-12 border-2 border-dashed border-muted hover:border-primary/50 hover:bg-muted/50 gap-2" onClick={addFunction}>
                                        <Plus className="h-4 w-4" />
                                        Add function declaration
                                    </Button>
                                </div>
                            </div>

                            {functions.length > 0 && (
                                <div className="p-2 flex justify-end px-6 border-t bg-muted/10">
                                    <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => setFunctions([])}>
                                        Remove all parameters (Clear)
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="px-6 py-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
