import React from "react";

const StudentStatCard = ({ title, value, iconClass, textColor, cardClass = "" }) => {
  return (
    <div className={`col-lg-3 col-md-4 col-sm-6 col-12`}>
      <div className={`card shadow-sm hover-stat-card ${cardClass}`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div className={`text-${textColor} text-uppercase fw-bold small mb-1`}>
              {title}
            </div>
            <div className="icon">
              <i className={`${iconClass} fa-lg text-muted`} />
            </div>
          </div>
          <div className="h5 mb-0 fw-bold text-gray-800">{value}</div>
        </div>
      </div>
    </div>
  );
};

export default StudentStatCard;
