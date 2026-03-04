import RecordRow from './RecordRow'
import { useSubnames } from '../hooks/useSubnames'

/**
 * SubnamesList — Lists tracked subnames of a parent name
 * @param {Object} props
 * @param {string} props.parentName - Parent name (e.g. "happy.rsk")
 * @param {Function} props.onManage - Called with fullName when "manage" is clicked
 */
export default function SubnamesList({ parentName, onManage }) {
    const { subnames, isLoading } = useSubnames(parentName)

    if (!parentName) return null

    // Only show if there are tracked subnames
    const existingSubnames = subnames.filter(s => s.exists)

    return (
        <section className="card">
            <h2 className="card-title">
                <span className="title-icon">▸</span> SUBNAMES
                <span className="subname-count">{existingSubnames.length}</span>
            </h2>

            {isLoading ? (
                <div className="loading-row">
                    <span className="spinner" />
                    <span>Loading subnames…</span>
                </div>
            ) : existingSubnames.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">◌</span>
                    <p>No tracked subnames. Create one below or search directly.</p>
                </div>
            ) : (
                <div className="records">
                    {existingSubnames.map(sub => (
                        <div key={sub.label} className="record-row subname-row">
                            <span className="record-label">
                                <span className="subname-label">{sub.label}</span>
                                <span className="subname-dot">.</span>
                                <span className="subname-parent">{parentName}</span>
                            </span>
                            <div className="record-right">
                                <span className="record-value mono">
                                    {sub.owner ? `${sub.owner.slice(0, 10)}...${sub.owner.slice(-6)}` : '—'}
                                </span>
                                {sub.hasResolver && <span className="resolver-dot" title="Has resolver">●</span>}
                                {!sub.hasResolver && <span className="resolver-dot dim" title="No resolver">○</span>}
                                <button
                                    className="btn-ghost btn-sm"
                                    onClick={() => onManage?.(sub.fullName)}
                                >
                                    MANAGE →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
