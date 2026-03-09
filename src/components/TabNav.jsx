import { useState } from 'react'

const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'content', label: 'Content' },
    { id: 'subnames', label: 'Subnames' },
]

export default function TabNav({ activeTab, onTabChange, counts = {} }) {
    return (
        <nav className="tab-nav">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <span className="tab-label">{tab.label}</span>
                    {counts[tab.id] !== undefined && counts[tab.id] > 0 && (
                        <span className="tab-count">{counts[tab.id]}</span>
                    )}
                </button>
            ))}
        </nav>
    )
}

export { TABS }
