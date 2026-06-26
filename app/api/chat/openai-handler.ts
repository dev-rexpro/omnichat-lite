import { NextResponse } from 'next/server';
import providersConfig from '@/config/inference-providers.json';

type ProviderId = keyof typeof providersConfig;

function getBaseUrl(provider: string, settings: any): string {
    const config = providersConfig[provider as ProviderId];
    // Use custom baseUrl from settings if provider allows it and user provided one
    const customBaseUrl = settings.providerBaseUrls?.[provider];
    const baseUrl = customBaseUrl || config?.baseUrl || '';

    // Normalize: remove trailing slash
    return baseUrl.replace(/\/+$/, '');
}

export async function handleOpenAICompatible(messages: any[], settings: any) {
    const { model, provider, temperature, advanced, systemInstruction, apiKeys } = settings;
    const apiKey = apiKeys?.[provider];
    const baseUrl = getBaseUrl(provider, settings);

    if (!baseUrl) {
        return NextResponse.json({ error: `Base URL not configured for provider: ${provider}` }, { status: 400 });
    }

    // Build OpenAI-compatible messages array
    const openaiMessages: any[] = [];

    // System instruction
    if (systemInstruction) {
        openaiMessages.push({ role: 'system', content: systemInstruction });
    }

    // Convert chat history
    for (const m of messages) {
        if (m.role === 'function') {
            // Skip function messages for non-Google providers
            continue;
        }

        let content = m.content || '';

        // Handle attachments - convert images to content array format
        if (m.attachments && m.attachments.length > 0) {
            const contentParts: any[] = [];
            if (content) {
                contentParts.push({ type: 'text', text: content });
            }
            for (const att of m.attachments) {
                if (att.type?.startsWith('image/') && att.data) {
                    contentParts.push({
                        type: 'image_url',
                        image_url: { url: att.data }
                    });
                } else if (att.content) {
                    // Text-based file content
                    contentParts.push({ type: 'text', text: `\n[File: ${att.name}]\n${att.content}\n` });
                }
            }
            openaiMessages.push({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: contentParts.length > 0 ? contentParts : content
            });
        } else {
            openaiMessages.push({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: content || ' '
            });
        }
    }

    // Build request body
    const body: any = {
        model: model,
        messages: openaiMessages,
        stream: true,
        temperature: temperature ?? 1,
    };

    // Add advanced params if available
    if (advanced?.maxOutputTokens) {
        body.max_tokens = advanced.maxOutputTokens;
    }
    if (advanced?.topP !== undefined) {
        body.top_p = advanced.topP;
    }
    if (advanced?.stopSequences && advanced.stopSequences.length > 0) {
        body.stop = advanced.stopSequences;
    }

    // Build headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const makeRequest = async (requestBody: any) => {
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `${provider} API Error: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }

            // Retry without max_tokens if the error is about context window / max_tokens limit
            if (requestBody.max_tokens != null && /max_tokens|context_window|context length/i.test(errorMessage)) {
                const retryBody = { ...requestBody };
                delete retryBody.max_tokens;
                return makeRequest(retryBody);
            }

            return { error: errorMessage, status: response.status };
        }

        return response;
    };

    try {
        const response = await makeRequest(body);
        if ('error' in response) {
            return NextResponse.json({ error: response.error }, { status: response.status });
        }

        const okResponse = response as Response;

        // Stream the SSE response, transforming to our frontend format
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = okResponse.body?.getReader();

        const customStream = new ReadableStream({
            async start(controller) {
                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    let buffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') {
                                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                continue;
                            }
                            if (!data) continue;

                            try {
                                const json = JSON.parse(data);
                                const delta = json.choices?.[0]?.delta;
                                if (!delta) continue;

                                const content = delta.content || '';
                                // Some providers (DeepSeek, Qwen) send reasoning_content
                                const reasoning = delta.reasoning_content || '';

                                if (content || reasoning) {
                                    const output = JSON.stringify({
                                        choices: [{
                                            delta: {
                                                content: content,
                                                reasoning_content: reasoning || undefined,
                                            },
                                            index: 0,
                                            finish_reason: null,
                                        }],
                                    });
                                    controller.enqueue(encoder.encode(`data: ${output}\n\n`));
                                }
                            } catch {
                                // Skip malformed JSON lines
                            }
                        }
                    }

                    // If buffer has remaining data
                    if (buffer.trim()) {
                        if (buffer.startsWith('data: ') && buffer.slice(6).trim() !== '[DONE]') {
                            // Try to parse remaining
                        }
                    }

                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
        console.error(`${provider} API Error:`, error);
        return NextResponse.json({
            error: error.message || `Failed to connect to ${provider}`
        }, { status: 500 });
    }
}
