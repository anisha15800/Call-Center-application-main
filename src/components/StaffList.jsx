import React, { useEffect, useMemo, useState } from "react";
import staffData from "../staffData";
import StaffCard from "./StaffCard";

const statusFilters = ["All staff", "Available", "Busy", "On break", "Offline"];
const statuses = ["Available", "Busy", "On break", "Offline"];

function StaffList() {
  const [staff, setStaff] = useState(staffData);
  const [activeFilter, setActiveFilter] = useState("All staff");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedStaff, setSelectedStaff] = useState(null);

  const counts = useMemo(() => ({
    "All staff": staff.length,
    Available: staff.filter((member) => member.status === "Available").length,
    Busy: staff.filter((member) => member.status === "Busy").length,
    "On break": staff.filter((member) => member.status === "On break").length,
    Offline: staff.filter((member) => member.status === "Offline").length,
  }), [staff]);

  const visibleStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff
      .filter((member) => activeFilter === "All staff" || member.status === activeFilter)
      .filter((member) => !query || [member.name, member.role, member.team, member.extension]
        .some((value) => value.toLowerCase().includes(query)))
      .sort((first, second) => sortBy === "calls"
        ? second.calls - first.calls
        : first.name.localeCompare(second.name));
  }, [staff, activeFilter, search, sortBy]);

  const updateStatus = (id, status) => {
    setStaff((currentStaff) => currentStaff.map((member) => (
      member.id === id ? { ...member, status } : member
    )));
    setSelectedStaff((current) => current && current.id === id ? { ...current, status } : current);
  };

  useEffect(() => {
    if (!selectedStaff) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSelectedStaff(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStaff]);

  const averageCsat = Math.round(staff.reduce((total, member) => total + member.csat, 0) / staff.length);

  return (
    <>
      <section className="stats-grid" aria-label="Team metrics">
        <button className={`stat-card ${activeFilter === "All staff" ? "stat-card-selected" : ""}`} onClick={() => setActiveFilter("All staff")}>
          <span className="stat-icon stat-icon-purple">◉</span>
          <span className="stat-copy"><span className="stat-label">TEAM MEMBERS</span><strong>{counts["All staff"]}</strong><span className="stat-note">Across all teams</span></span>
        </button>
        <button className={`stat-card ${activeFilter === "Available" ? "stat-card-selected" : ""}`} onClick={() => setActiveFilter("Available")}>
          <span className="stat-icon stat-icon-green">✓</span>
          <span className="stat-copy"><span className="stat-label">AVAILABLE NOW</span><strong>{counts.Available}</strong><span className="stat-note"><span className="mini-dot dot-available" /> Ready for calls</span></span>
        </button>
        <div className="stat-card stat-card-static">
          <span className="stat-icon stat-icon-blue">↗</span>
          <span className="stat-copy"><span className="stat-label">CALLS TODAY</span><strong>{staff.reduce((total, member) => total + member.calls, 0)}</strong><span className="stat-note">Handled by your team</span></span>
        </div>
        <div className="stat-card stat-card-static">
          <span className="stat-icon stat-icon-amber">★</span>
          <span className="stat-copy"><span className="stat-label">AVG. CSAT</span><strong>{averageCsat}<small>%</small></strong><span className="stat-note">Customer satisfaction</span></span>
        </div>
      </section>

      <section className="roster-section" aria-labelledby="roster-heading">
        <div className="roster-heading-row">
          <div>
            <h2 id="roster-heading">Team roster <span className="roster-total">{staff.length}</span></h2>
            <p>Manage availability and see who's on your floor.</p>
          </div>
          <div className="roster-tools">
            <label className="search-box">
              <span aria-hidden="true" className="search-icon">⌕</span>
              <span className="sr-only">Search staff</span>
              <input
                type="search"
                placeholder="Search staff or team..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && <button className="clear-search" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
            </label>
            <label className="sort-control">
              <span className="sr-only">Sort staff by</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="name">Name A–Z</option>
                <option value="calls">Most calls</option>
              </select>
            </label>
          </div>
        </div>

        <div className="filter-row" role="group" aria-label="Filter staff by status">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              className={`filter-chip ${activeFilter === filter ? "filter-chip-active" : ""}`}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {filter === "Available" && <span className="mini-dot dot-available" />}
              {filter === "Busy" && <span className="mini-dot dot-busy" />}
              {filter === "On break" && <span className="mini-dot dot-break" />}
              {filter === "Offline" && <span className="mini-dot dot-offline" />}
              {filter} <span className="filter-count">{counts[filter]}</span>
            </button>
          ))}
        </div>

        {visibleStaff.length > 0 ? (
          <div className="staff-grid">
            {visibleStaff.map((member) => (
              <StaffCard
                key={member.id}
                staff={member}
                onStatusChange={(status) => updateStatus(member.id, status)}
                onView={() => setSelectedStaff(member)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">⌕</span>
            <h3>No team members found</h3>
            <p>Try a different name, team, or availability filter.</p>
            <button className="text-button" onClick={() => { setSearch(""); setActiveFilter("All staff"); }}>Clear filters</button>
          </div>
        )}
      </section>

      {selectedStaff && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedStaff(null);
        }}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-name">
            <button className="modal-close" onClick={() => setSelectedStaff(null)} aria-label="Close profile">×</button>
            <div className={`staff-avatar avatar-${selectedStaff.color} profile-avatar`}>{selectedStaff.initials}</div>
            <p className="eyebrow">TEAM MEMBER PROFILE</p>
            <h2 id="profile-name">{selectedStaff.name}</h2>
            <p className="profile-role">{selectedStaff.role} · {selectedStaff.team}</p>
            <div className="profile-status-row">
              <span>Availability</span>
              <label className={`status-select-wrap status-${selectedStaff.status.toLowerCase().replace(" ", "-")}`}>
                <span className="mini-dot" />
                <select value={selectedStaff.status} onChange={(event) => updateStatus(selectedStaff.id, event.target.value)} aria-label={`Availability for ${selectedStaff.name}`}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
            <div className="profile-details">
              <div><span>Extension</span><strong>{selectedStaff.extension}</strong></div>
              <div><span>Shift today</span><strong>{selectedStaff.shift}</strong></div>
              <div><span>Calls handled</span><strong>{selectedStaff.calls}</strong></div>
              <div><span>CSAT score</span><strong>{selectedStaff.csat}%</strong></div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default StaffList;
