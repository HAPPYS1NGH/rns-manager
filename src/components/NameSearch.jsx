import { useState, useEffect } from 'react'
import { normalizeRouteNameParam } from '../utils/name-route'

/**
 * NameSearch — Search bar for looking up RNS names
 * Auto-appends .rsk if the user doesn't include it.
 *
 * @param {Object} props
 * @param {Function} props.onSearch - Called with the validated full name string
 * @param {string} [props.initialValue] - Pre-fill from URL route
 */
export default function NameSearch({ onSearch, initialValue }) {
    const [input, setInput] = useState('')
    const [error, setError] = useState('')

    // Sync from external route changes
    useEffect(() => {
        if (initialValue) {
            // Strip .rsk suffix for display
            const display = initialValue.endsWith('.rsk')
                ? initialValue.slice(0, -4)
                : initialValue
            setInput(display)
        } else {
            setInput('')
        }
    }, [initialValue])

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        const trimmed = input.trim().toLowerCase()
        if (!trimmed) return

        const normalized = normalizeRouteNameParam(trimmed)
        if (!normalized.isValid || !normalized.canonicalName) {
            setError('Invalid RNS name — check for unsupported characters')
            return
        }

        onSearch(normalized.canonicalName)
    }

    return (
        <section className="card">
            <h2 className="card-title">
                <span className="title-icon">▸</span> LOOKUP NAME
            </h2>
            <form onSubmit={handleSubmit} className="search-form">
                <div className="input-row">
                    <div className="input-wrap">
                        <input
                            className="input"
                            type="text"
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value)
                                setError('')
                            }}
                            placeholder="happy"
                            spellCheck={false}
                            autoComplete="off"
                            id="name-search-input"
                        />
                        <span className="input-suffix">.rsk</span>
                    </div>
                    <button className="btn-search" type="submit" id="name-search-button">
                        SEARCH
                    </button>
                </div>
                {error && <p className="field-error">{error}</p>}
            </form>
        </section>
    )
}
