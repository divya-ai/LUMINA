import React, { memo } from 'react';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer = memo<MarkdownRendererProps>(({ content }) => {
    // Simple parser to separate code blocks from text blocks
    const blocks = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="space-y-4">
            {blocks.map((block, index) => {
                // Render Code Block
                if (block.startsWith('\`\`\`') && block.endsWith('\`\`\`')) {
                    const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
                    const language = match?.[1] || 'text';
                    const code = match?.[2] || block.slice(3, -3).trim();

                    return (
                        <div key={index} className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 my-4 shadow-lg group">
                            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                                <span className="text-xs font-mono text-zinc-400 capitalize">{language}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(code)}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    Copy Code
                                </button>
                            </div>
                            <pre className="p-4 overflow-x-auto text-sm font-mono text-zinc-300">
                                <code>{code}</code>
                            </pre>
                        </div>
                    );
                }

                // Render Text Block with basic inline styling
                if (!block.trim()) return null;

                const renderInlineStyles = (text: string) => {
                    // Headers
                    let elements: React.ReactNode[] = [];

                    // Split by paragraphs
                    const paragraphs = text.split('\n\n');

                    return paragraphs.map((para, pIdx) => {
                        // Trim and split by bold/code
                        const parts = para.split(/(\*\*.*?\*\*|`.*?`)/g);

                        return (
                            <p key={pIdx} className="leading-relaxed whitespace-pre-wrap">
                                {parts.map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                                    }
                                    if (part.startsWith('\`') && part.endsWith('\`')) {
                                        return (
                                            <code key={i} className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-blue-300 font-mono text-[13px] border border-zinc-700/50">
                                                {part.slice(1, -1)}
                                            </code>
                                        );
                                    }
                                    return part;
                                })}
                            </p>
                        );
                    });
                };

                return (
                    <div key={index} className="space-y-3">
                        {renderInlineStyles(block)}
                    </div>
                );
            })}
        </div>
    );
});
