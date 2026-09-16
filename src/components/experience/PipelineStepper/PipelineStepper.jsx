import React from 'react';
import './PipelineStepper.css';

/**
 * Horizontal step indicator for the document -> experience pipeline.
 * `steps` is an ordered list of { id, label }; `activeIndex` is the index
 * of the step currently in progress (everything before it is complete).
 */
export default function PipelineStepper({ steps, activeIndex }) {
  return (
    <div className="pipeline-stepper" role="list" aria-label="Processing pipeline progress">
      {steps.map((step, index) => {
        const status = index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'pending';

        return (
          <React.Fragment key={step.id}>
            <div className={`pl-step ${status}`} role="listitem" aria-current={status === 'active' ? 'step' : undefined}>
              <span className="pl-num">
                {status === 'completed' ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className="pl-label">{step.label}</span>
            </div>
            {index < steps.length - 1 && <span className="pl-arrow">→</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
