import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = '', 
  fullScreen = false,
  overlay = false 
}) => {
  const spinnerClasses = [
    'loading-spinner',
    `spinner-${size}`,
    `spinner-${color}`,
    fullScreen ? 'fullscreen' : '',
    overlay ? 'overlay' : ''
  ].filter(Boolean).join(' ');

  const content = (
    <div className={spinnerClasses}>
      <div className="spinner-container">
        <div className="spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        {text && <div className="spinner-text">{text}</div>}
      </div>
    </div>
  );

  return content;
};

// Specialized loading components
export const PageLoader = ({ text = 'Loading...' }) => (
  <LoadingSpinner size="large" fullScreen={true} text={text} />
);

export const ButtonLoader = ({ text = '' }) => (
  <LoadingSpinner size="small" text={text} />
);

export const SectionLoader = ({ text = 'Loading...' }) => (
  <LoadingSpinner size="medium" text={text} />
);

export const OverlayLoader = ({ text = 'Processing...' }) => (
  <LoadingSpinner size="large" overlay={true} text={text} />
);

// Skeleton loading components
export const SkeletonLoader = ({ width = '100%', height = '20px', className = '' }) => (
  <div 
    className={`skeleton-loader ${className}`}
    style={{ width, height }}
  />
);

export const CardSkeleton = () => (
  <div className="card-skeleton">
    <SkeletonLoader height="200px" className="skeleton-image" />
    <div className="skeleton-content">
      <SkeletonLoader height="24px" width="80%" className="skeleton-title" />
      <SkeletonLoader height="16px" width="60%" className="skeleton-subtitle" />
      <SkeletonLoader height="16px" width="100%" className="skeleton-text" />
      <SkeletonLoader height="16px" width="90%" className="skeleton-text" />
      <div className="skeleton-actions">
        <SkeletonLoader height="36px" width="100px" className="skeleton-button" />
        <SkeletonLoader height="36px" width="80px" className="skeleton-button" />
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="table-skeleton">
    <div className="skeleton-table-header">
      {Array.from({ length: columns }, (_, i) => (
        <SkeletonLoader key={i} height="20px" width="80%" />
      ))}
    </div>
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="skeleton-table-row">
        {Array.from({ length: columns }, (_, colIndex) => (
          <SkeletonLoader key={colIndex} height="16px" width="70%" />
        ))}
      </div>
    ))}
  </div>
);

export default LoadingSpinner;