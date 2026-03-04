import { useState } from 'react'
import { normalize } from 'viem/ens'

/**
 * NameSearch — Search bar for looking up RNS names
 * @param {Object} props
 * @param {Function} props.onSearch - Called with the validated name string
 */
export default function NameSearch({ onSearch }) {
    const [input, setInput] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        const trimmed = input.trim().toLowerCase()
        if (!trimmed) return

        if (!trimmed.endsWith('.rsk')) {
            setError('Name must end with .rsk  (e.g. happy.rsk)')
            return
        }
        try {
            normalize(trimmed)
            onSearch(trimmed)
        } catch {
            setError('Invalid RNS name — check for unsupported characters')
        }
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
                            placeholder="happy.rsk"
                            spellCheck={false}
                            autoComplete="off"
                            id="name-search-input"
                        />
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
