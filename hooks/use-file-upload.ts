// @ts-ignore
// import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
// import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import { useState } from 'react';
import { toast } from 'sonner';

// Configure PDF.js worker
// Using local worker file copied to public/ folder for maximum stability
// We will set this dynamically when loading the module
// const WORKER_SRC = '/pdf.worker.min.js'; // No longer needed

export interface FileAttachment {
    name: string;
    type: string;
    data: string; // Base64 data URL or string content for text
    content?: string; // Extracted text content for PDF/Text (Optional now for PDFs)
}

export interface FileUploadApi {
    /** Array of uploaded files/items */
    attachments: FileAttachment[];
    /** Adds new items to the upload list */
    addAttachments: (items: FileAttachment[]) => void;
    /** Removes an item at the specified index */
    removeAttachment: (idx: number) => void;
    /** Clears all items from the upload list */
    clearAttachments: () => void;
    /** Handles file uploads and processes them based on type */
    handleFiles: (files: FileList | File[]) => Promise<void>;
}

interface UseFileUploadOptions {
    pdfAsImage?: boolean; // Deprecated but kept for compatibility
}

/**
 * Custom React hook for handling file uploads and processing various file types
 */
export function useFileUpload(
    options: UseFileUploadOptions = { pdfAsImage: false }
): FileUploadApi {
    // const { pdfAsImage } = options; // No longer used
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);

    const addAttachments = (newItems: FileAttachment[]) => {
        setAttachments((prev) => [...prev, ...newItems]);
    };

    const removeAttachment = (idx: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

    const clearAttachments = () => {
        setAttachments([]);
    };

    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            try {
                const mimeType = file.type;

                // Limit file size (e.g. 50MB) 
                if (file.size > 50 * 1024 * 1024) {
                    toast.error(`File ${file.name} is too large (max 50MB)`);
                    continue;
                }

                if (mimeType.startsWith('image/')) {
                    const base64Url = await getFileAsBase64(file, true);
                    addAttachments([{
                        name: file.name,
                        type: mimeType,
                        data: base64Url
                    }]);
                }
                else if (mimeType === 'application/pdf') {
                    // Optimized: Use Gemini Native PDF Support
                    // Instead of parsing text client-side (which causes Webpack/PWA issues),
                    // we send the PDF as a Base64 blob to the API.
                    // Gemini 1.5/2.0 supports treating PDF as an image/document natively.

                    const base64Url = await getFileAsBase64(file, true);
                    addAttachments([{
                        name: file.name,
                        type: 'application/pdf',
                        data: base64Url,
                        // No content extracted here. The backend will use 'data' to create an inlineData part.
                    }]);
                    toast.success(`PDF ${file.name} attached for analysis`);
                }
                else if (mimeType.startsWith('text/') || mimeType === 'application/json' || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js') || file.name.endsWith('.md')) {
                    const content = await getFileAsText(file);
                    addAttachments([{
                        name: file.name,
                        type: 'text/plain',
                        data: '[Text File]',
                        content: content
                    }]);
                }
                else {
                    toast.error(`Unsupported file type: ${mimeType}`);
                }

            } catch (error) {
                console.error("File processing error:", error);
                toast.error(`Failed to process ${file.name}`);
            }
        }
    };

    return {
        attachments,
        addAttachments,
        removeAttachment,
        clearAttachments,
        handleFiles
    };
}


// --- Helper Functions ---

function getFileAsBase64(file: File, outputUrl = true): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                let result = event.target.result as string;
                if (!outputUrl) {
                    result = result.substring(result.indexOf(',') + 1);
                }
                resolve(result);
            } else {
                reject(new Error("Failed to read file"));
            }
        };
        reader.readAsDataURL(file);
    });
}

function getFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string);
            } else {
                reject(new Error("Failed to read text file"));
            }
        };
        reader.readAsText(file);
    });
}

// Helper functions for parsing removed as we use native Gemini API support now
