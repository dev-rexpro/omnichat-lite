import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleImageGeneration } from './image-gen-helper';
import { handleOpenAICompatible } from './openai-handler';

async function handleDeepResearch(messages: any[], apiKey: string) {
    const lastMessage = messages[messages.length - 1];
    const input = lastMessage.content; // Note: Attachments handling omitted for preview simplification

    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
                input: input,
                agent: "deep-research-pro-preview-12-2025",
                background: true,
                stream: true,
                agent_config: {
                    type: "deep-research",
                    thinking_summaries: "auto"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deep Research API Error: ${response.status} ${errorText}`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = response.body?.getReader();

        const customStream = new ReadableStream({
            async start(controller) {
                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    let buffer = "";
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ""; // Keep incomplete line

                        let currentEvent = null;

                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                currentEvent = line.slice(7).trim();
                            } else if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6).trim();
                                if (!dataStr) continue;

                                try {
                                    const data = JSON.parse(dataStr);

                                    let chunkText = "";
                                    let reasoningText = "";

                                    // Map Interactions API events to frontend format
                                    if (currentEvent === 'content.delta') {
                                        if (data.delta?.type === 'text') {
                                            chunkText = data.delta.text;
                                        } else if (data.delta?.type === 'thought_summary') {
                                            // Format thoughts nicely: "Thought: ..."
                                            // Or send as reasoning_content if you want it in the thinking block
                                            reasoningText = `\nThought: ${data.delta.content.text}\n`;
                                        }
                                    }

                                    if (chunkText || reasoningText) {
                                        const output = JSON.stringify({
                                            choices: [{
                                                delta: {
                                                    content: chunkText,
                                                    reasoning_content: reasoningText || undefined
                                                },
                                                index: 0,
                                                finish_reason: null,
                                            }],
                                        });
                                        controller.enqueue(encoder.encode(`data: ${output}\n\n`));
                                    }
                                } catch (e) {
                                    // Ignore parsing errors for non-JSON data lines
                                }
                            }
                        }
                    }
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Deep Research Error:', error);
        return NextResponse.json({
            error: error.message || 'Deep Research Failed'
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { messages, settings } = await req.json();
        const { model, provider, temperature, advanced, systemInstruction, apiKeys } = settings;

        const apiKey = apiKeys?.[provider];

        if (!apiKey) {
            return NextResponse.json({
                error: `${provider} API Key is required. Please update your Settings.`
            }, { status: 400 });
        }

        // Delegate non-Google providers to OpenAI-compatible handler
        if (provider !== 'google') {
            return await handleOpenAICompatible(messages, settings);
        }

        // Branching for Deep Research
        if (settings.tools?.deepResearch) {
            return await handleDeepResearch(messages, apiKey);
        }

        // Branching for Image Generation
        const isImageModel = model.includes("image");
        if (isImageModel) {
            return await handleImageGeneration(messages, model, apiKey);
        }



        // Initialize Google Generative AI
        const genAI = new GoogleGenerativeAI(apiKey);

        // Tools configuration
        const tools: any[] = [];

        // Determine if Google Search Grounding should be enabled
        // User feedback suggests URL Context works best when Grounding is also active
        // so we enable it if either Google Search OR URL Context is requested.
        const enableGoogleSearch = settings.tools?.googleSearch || settings.tools?.urlContext;

        if (enableGoogleSearch) {
            // Use googleSearchRetrieval for Gemini 1.5 models (legacy)
            if (model.includes("1.5")) {
                tools.push({ googleSearchRetrieval: {} });
            } else {
                // Use googleSearch for Gemini 2.0 and later
                tools.push({ googleSearch: {} });
            }
        }

        if (settings.tools?.canvas) {
            tools.push({ codeExecution: {} });
        }

        if (settings.tools?.functionCalling && settings.functionDeclarations) {
            try {
                const funcs = JSON.parse(settings.functionDeclarations);
                if (Array.isArray(funcs) && funcs.length > 0) {
                    tools.push({ functionDeclarations: funcs });
                }
            } catch (e) {
                console.warn("Failed to parse function declarations:", e);
            }
        }

        if (settings.tools?.urlContext) {
            // Add URL Context tool - using snake_case to match REST API
            // @ts-ignore
            tools.push({ url_context: {} });
        }

        // Thinking configuration
        let thinkingConfig: any = undefined;
        if (settings.thinking && !model.includes("2.0-flash")) {
            if (model.includes("gemini-3")) {
                thinkingConfig = {
                    includeThoughts: true,
                    thinkingLevel: settings.thinkingLevel || 'medium'
                };
            } else {
                // For 1.5-pro, 2.5-pro, etc. that support budget
                thinkingConfig = {
                    includeThoughts: true,
                    thinkingBudget: settings.thinkingBudget || 8000
                };
            }
        }

        // Append custom system instructions for Canvas tool if enabled
        let finalSystemInstruction = systemInstruction || "";
        if (settings.tools?.canvas) {
            finalSystemInstruction += "\n\nCRITICAL DIRECTIVE FOR CANVAS TOOL:\nIf the user asks you to write code for a website, web app, UI component, or game, you must ALWAYS write it as a SINGLE, fully self-contained HTML file inside a single ```html code block. Write all CSS inside inline <style> tags (or use Tailwind CSS via CDN: <script src=\"https://cdn.tailwindcss.com\"></script>) and all JavaScript inside inline <script> tags. Do NOT split the code into separate blocks for HTML, CSS, and JS. Ensure it is fully styled and interactive.";
        }

        // Configuration model
        const modelInstance = genAI.getGenerativeModel({
            model: model,
            systemInstruction: finalSystemInstruction || undefined,
            tools: tools.length > 0 ? tools : undefined,
        });

        const generationConfig = {
            temperature: temperature,
            topP: advanced.topP,
            topK: advanced.topK,
            maxOutputTokens: advanced.maxOutputTokens,
            stopSequences: advanced.stopSequences?.length > 0 ? advanced.stopSequences : undefined,
            // @ts-ignore
            thinkingConfig: thinkingConfig,
        };

        // Format messages untuk Gemini SDK (alternating user/model)
        const history = messages.slice(0, -1).map((m: any) => {
            if (m.role === 'function') {
                let responseContent = {};
                try {
                    responseContent = JSON.parse(m.content);
                } catch (e) {
                    responseContent = { result: m.content };
                }
                return {
                    role: 'function',
                    parts: [{
                        functionResponse: {
                            name: m.name,
                            response: responseContent
                        }
                    }]
                };
            }

            const parts: any[] = [];

            const isAssistant = m.role === 'assistant';
            const includeReasoning = !settings.excludeThinkingOnSubmit && isAssistant && m.reasoning_content;

            let textContent = m.content || "";
            if (includeReasoning) {
                textContent = `<thought>\n${m.reasoning_content}\n</thought>\n\n${textContent}`;
            }

            if (textContent) {
                parts.push({ text: textContent });
            }

            if (m.attachments && m.attachments.length > 0) {
                m.attachments.forEach((att: any) => {
                    if (att.content) {
                        parts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
                    } else if (att.data && att.data.includes('base64,')) {
                        // Extract base64 data from Data URI: "data:image/png;base64,iVBOR..."
                        const base64Data = att.data.split(',')[1];
                        parts.push({
                            inlineData: {
                                mimeType: att.type,
                                data: base64Data
                            }
                        });
                    }
                });
            }

            // Include function calls in history
            if (isAssistant && m.functionCalls && m.functionCalls.length > 0) {
                m.functionCalls.forEach((call: any) => {
                    parts.push({
                        functionCall: {
                            name: call.name,
                            args: call.args
                        }
                    });
                });
            }

            // Gemini doesn't like completely empty parts, so add a space if both are missing
            if (parts.length === 0) {
                parts.push({ text: " " });
            }

            return {
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: parts,
            };
        });

        const lastMsgObj = messages[messages.length - 1];
        const lastMessageContent = lastMsgObj.content;
        const lastMessageParts: any[] = [];

        if (lastMessageContent) {
            lastMessageParts.push({ text: lastMessageContent });
        }

        if (lastMsgObj.attachments && lastMsgObj.attachments.length > 0) {
            lastMsgObj.attachments.forEach((att: any) => {
                if (att.content) {
                    lastMessageParts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
                } else if (att.data && att.data.includes('base64,')) {
                    const base64Data = att.data.split(',')[1];
                    lastMessageParts.push({
                        inlineData: {
                            mimeType: att.type,
                            data: base64Data
                        }
                    });
                }
            });
        }

        const chatSession = modelInstance.startChat({
            generationConfig,
            history,
        });

        // Mulai streaming
        const result = await chatSession.sendMessageStream(lastMessageParts);

        // Transform stream Gemini ke format OpenAI-compatible (untuk front-end yang sudah ada)
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                try {
                    let groundingMetadata: any = null;

                    for await (const chunk of result.stream) {
                        const candidate = (chunk as any).candidates?.[0];
                        const parts = candidate?.content?.parts || [];

                        // Capture grounding metadata if present (usually in the first or last chunk)
                        if (candidate?.groundingMetadata) {
                            groundingMetadata = candidate.groundingMetadata;
                        }

                        let chunkText = "";
                        let reasoningText = "";
                        const functionCalls: any[] = [];

                        for (const part of parts) {
                            if ('thought' in part && (part as any).thought === true) {
                                reasoningText += (part as any).text || "";
                            } else if ('text' in part) {
                                chunkText += (part as any).text;
                            } else if ('functionCall' in part) {
                                functionCalls.push((part as any).functionCall);
                            } else if ('executableCode' in part) {
                                const code = (part as any).executableCode.code;
                                chunkText += `\n\`\`\`python\n${code}\n\`\`\`\n`;
                            } else if ('codeExecutionResult' in part) {
                                const output = (part as any).codeExecutionResult.output;
                                chunkText += `\n\`\`\`\nOutput:\n${output}\n\`\`\`\n`;
                            }
                        }

                        if (chunkText || reasoningText || functionCalls.length > 0) {
                            const data = JSON.stringify({
                                choices: [
                                    {
                                        delta: {
                                            content: chunkText,
                                            reasoning_content: reasoningText || undefined,
                                            function_calls: functionCalls.length > 0 ? functionCalls : undefined
                                        },
                                        index: 0,
                                        finish_reason: null,
                                    },
                                ],
                            });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                    }

                    // Send grounding metadata as a separate event if captured
                    if (groundingMetadata) {
                        const metaData = JSON.stringify({
                            groundingMetadata: groundingMetadata
                        });
                        controller.enqueue(encoder.encode(`data: ${metaData}\n\n`));
                    }

                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Gemini SDK Error:', error);
        return NextResponse.json({
            error: error.message || 'Terjadi kesalahan pada Google Gemini SDK'
        }, { status: 500 });
    }
}
