/**
 * SubnamesList — Lists discovered subnames of a parent name
 * @param {Object} props
 * @param {string} props.parentName - Parent name (e.g. "happy.rsk")
 * @param {Function} props.onManage - Called with fullName when "manage" is clicked
 */
export default function SubnamesList({ parentName, subnamesData, onManage }) {
    const { subnames = [], isLoading = false } = subnamesData || {}

    if (!parentName) return null

    // Only show subnames that exist on-chain
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
                    <span>Discovering subnames…</span>
                </div>
            ) : existingSubnames.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">◌</span>
                    <p>No subnames found for this name.</p>
                </div>
            ) : (
                <div className="records">
                    {existingSubnames.map(sub => (
                        <div
                            key={sub.labelHash}
                            className={`record-row subname-row ${sub.fullName ? 'clickable' : ''}`}
                            role={sub.fullName ? 'button' : undefined}
                            tabIndex={sub.fullName ? 0 : undefined}
                            onClick={sub.fullName ? () => onManage?.(sub.fullName) : undefined}
                            onKeyDown={sub.fullName ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onManage?.(sub.fullName) } } : undefined}
                        >
                            <span className="record-label">
                                {sub.label ? (
                                    <>
                                        <span className="subname-label">{sub.label}</span>
                                        <span className="subname-dot">.</span>
                                        <span className="subname-parent">{parentName}</span>
                                    </>
                                ) : (
                                    <span className="subname-label subname-hash" title={sub.labelHash}>
                                        {sub.labelHash.slice(0, 10)}…
                                        <span className="subname-dot">.</span>
                                        <span className="subname-parent">{parentName}</span>
                                    </span>
                                )}
                            </span>
                            <div className="record-right">
                                <span className="record-value mono">
                                    {sub.owner ? `${sub.owner.slice(0, 10)}...${sub.owner.slice(-6)}` : '—'}
                                </span>
                                {sub.hasResolver && <span className="resolver-dot" title="Has resolver">●</span>}
                                {!sub.hasResolver && <span className="resolver-dot dim" title="No resolver">○</span>}
                                {sub.fullName && (
                                    <span className="manage-hint">Check →</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
