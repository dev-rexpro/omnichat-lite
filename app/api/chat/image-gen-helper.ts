import { NextResponse } from 'next/server';

export async function handleImageGeneration(messages: any[], model: string, apiKey: string) {
    try {
        const lastMessage = messages[messages.length - 1];
        const prompt = lastMessage.content;

        // Construct the request body for the REST API
        // https://ai.google.dev/api/generate-content#v1beta.models.generateContent
        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Image Generation API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        // Extract the image data
        // The structure should be candidates[0].content.parts[0].inlineData
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        let markdownContent = "";

        for (const part of parts) {
            if (part.text) {
                markdownContent += part.text + "\n\n";
            }
            if (part.inlineData) {
                const mimeType = part.inlineData.mimeType;
                const base64Data = part.inlineData.data;
                markdownContent += `![Generated Image](data:${mimeType};base64,${base64Data})\n\n`;
            }
        }

        if (!markdownContent) {
            markdownContent = "No image was generated. Please try a different prompt.";
        }

        // Stream the result back to the client
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            start(controller) {
                const chunk = JSON.stringify({
                    choices: [{
                        delta: {
                            content: markdownContent
                        },
                        index: 0,
                        finish_reason: "stop"
                    }]
                });
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
            }
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Image Generation Error:', error);
        return NextResponse.json({
            error: error.message || 'Image Generation Failed'
        }, { status: 500 });
    }
}
