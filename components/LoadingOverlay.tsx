'use client';

import Image from 'next/image';

const LoadingOverlay = () => {
  return (
    <div className="loading-wrapper">
      <div className="loading-shadow-wrapper auth-shadow bg-[var(--bg-primary)]">
        <div className="loading-shadow">
          <Image
            src="/assets/loader.png"
            alt="Loading"
            width={56}
            height={56}
            className="loading-animation"
          />
          <p className="loading-title">Synthesizing your book...</p>
          <div className="loading-progress">
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span>Uploading files</span>
            </div>
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span>Validating metadata</span>
            </div>
            <div className="loading-progress-item">
              <span className="loading-progress-status" />
              <span>Preparing voice profile</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
