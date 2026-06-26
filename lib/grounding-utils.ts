export interface GroundingMetadata {
    webSearchQueries?: string[]
    groundingChunks?: Array<{
        web?: {
            uri?: string
            title?: string
        }
    }>
    groundingSupports?: Array<{
        segment: {
            startIndex: number
            endIndex: number
            text: string
        }
        groundingChunkIndices: number[]
    }>
    searchEntryPoint?: {
        renderedContent?: string
    }
}

/**
 * Injects inline citations into the text based on Gemini's grounding metadata.
 * Follows the official pattern: matching segments and appending [n] links.
 */
export function addCitations(text: string, metadata?: GroundingMetadata): string {
    if (!text || !metadata || !metadata.groundingSupports || !metadata.groundingChunks) {
        return text;
    }

    const supports = metadata.groundingSupports;
    const chunks = metadata.groundingChunks;

    // We need to insert citations at specific indices.
    // To avoid messing up indices as we insert, we process from end to start.
    // The 'endIndex' in groundingSupports refers to the index in the original text.

    // Sort supports by endIndex descending
    const sortedSupports = [...supports].sort(
        (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
    );

    let processedText = text;

    for (const support of sortedSupports) {
        const endIndex = support.segment?.endIndex;
        const indices = support.groundingChunkIndices;

        if (endIndex === undefined || !indices || indices.length === 0) {
            continue;
        }

        // Build citation string: " [[1]](url) [[2]](url)"
        // Using double brackets [[n]] to denote citations for potential custom styling later,
        // or standard markdown links [n](url).
        // User requested "[1][2]" style. Let's make them markdown links.

        // Check if the text already has citations at this position (heuristic)
        // Sometimes the model DOES include them, sometimes NOT.
        // But groundingSupports is the source of truth.
        // If we just append, we might double up if the model learned to produce them.
        // However, usually with the 'googleSearch' tool, it returns clean text + metadata.

        // Let's assume we append.
        const citationLinks = indices.map(i => {
            const chunk = chunks[i];
            if (chunk?.web?.uri) {
                // We use a small non-breaking space or just space before?
                // Usually footnotes are attached.
                // Let's produce standard markdown link: [index+1](uri)
                return `[[${i + 1}]](${chunk.web.uri})`;
            }
            return null;
        }).filter(Boolean);

        if (citationLinks.length > 0) {
            const citationString = " " + citationLinks.join(""); // Add space before citations

            // Insert at the end of the segment
            if (endIndex <= processedText.length) {
                processedText =
                    processedText.slice(0, endIndex) +
                    citationString +
                    processedText.slice(endIndex);
            }
        }
    }

    return processedText;
}
