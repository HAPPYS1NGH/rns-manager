import { useState } from 'react'

/**
 * RecordRow — Reusable single-record display row
 * @param {Object} props
 * @param {string} props.label - Record label (e.g. "OWNER", "avatar")
 * @param {string} [props.value] - Record value to display
 * @param {boolean} [props.loading] - Show loading state
 * @param {boolean} [props.dim] - Show dimmed/empty state
 * @param {string} [props.dimText] - Text for dimmed state
 * @param {boolean} [props.editable] - Show edit button
 * @param {Function} [props.onEdit] - Called when edit is clicked
 * @param {boolean} [props.mono] - Use monospace font for value
 */
export default function RecordRow({
    label,
    value,
    loading = false,
    dim = false,
    dimText = '—',
    editable = false,
    onEdit,
    mono = true,
}) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = () => {
        if (!value) return
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div className="record-row">
            <span className="record-label">{label}</span>
            <div className="record-right">
                {loading ? (
                    <span className="record-value dim">loading…</span>
                ) : dim || !value ? (
                    <span className="record-value dim">{dimText}</span>
                ) : (
                    <>
                        <span className={`record-value ${mono ? 'mono' : ''}`}>{value}</span>
                        <button
                            className="copy-btn"
                            onClick={copyToClipboard}
                            title="Copy"
                        >
                            {copied ? '✓' : '⎘'}
                        </button>
                        {editable && onEdit && (
                            <button className="edit-btn" onClick={onEdit} title="Edit">
                                ✎
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
