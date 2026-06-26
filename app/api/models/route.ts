import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const baseUrl = searchParams.get('baseUrl');
    const apiKey = searchParams.get('apiKey');

    if (!baseUrl) {
        return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
    }

    // Normalize base URL
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
        const response = await fetch(`${normalizedBaseUrl}/v1/models`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Failed to fetch models: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        const data = await response.json();

        // OpenAI-compatible format: { data: [{ id: "...", ... }] }
        // Some providers return { object: "list", data: [...] }
        const models = (data.data || data || []).map((m: any) => ({
            id: m.id || m.name || m.model,
            name: m.name || m.id || m.model,
            created: m.created,
            owned_by: m.owned_by,
        })).filter((m: any) => m.id); // Filter out entries without an ID

        // Sort alphabetically by id
        models.sort((a: any, b: any) => a.id.localeCompare(b.id));

        return NextResponse.json({ models });
    } catch (error: any) {
        console.error('Fetch models error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to fetch models from provider'
        }, { status: 500 });
    }
}
