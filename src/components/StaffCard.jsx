import React from "react";

const statusClass = (status) => status.toLowerCase().replace(" ", "-");

function StaffCard({ staff, onStatusChange, onView }) {
  return (
    <article className="staff-card">
      <div className="staff-card-top">
        <div className={`staff-avatar avatar-${staff.color}`}>{staff.initials}</div>
        <label className={`status-select-wrap status-${statusClass(staff.status)}`}>
          <span className="mini-dot" />
          <span className="sr-only">Availability for {staff.name}</span>
          <select value={staff.status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="Available">Available</option>
            <option value="Busy">Busy</option>
            <option value="On break">On break</option>
            <option value="Offline">Offline</option>
          </select>
        </label>
      </div>
      <div className="staff-identity">
        <h3>{staff.name}</h3>
        <p>{staff.role}</p>
      </div>
      <div className="staff-meta">
        <span className="team-tag">{staff.team}</span>
        <span className="extension">EXT. {staff.extension}</span>
      </div>
      <div className="staff-card-footer">
        <div className="staff-performance">
          <span><strong>{staff.calls}</strong> calls</span>
          <span><strong>{staff.csat}%</strong> CSAT</span>
        </div>
        <button className="profile-link" onClick={onView}>View profile <span aria-hidden="true">→</span></button>
      </div>
    </article>
  );
}

export default StaffCard;
