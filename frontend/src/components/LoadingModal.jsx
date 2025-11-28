import React, { useEffect, useState } from "react";
import "./LoadingModal.css";

const LOADING_STEPS = [
  { id: 1, text: "Validando filtros...", duration: 500 },
  { id: 2, text: "Consultando base de datos...", duration: 2000 },
  { id: 3, text: "Procesando resultados...", duration: 1500 },
  { id: 4, text: "Preparando visualización...", duration: 1000 },
];

export default function LoadingModal({ isOpen, onComplete, error }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    // Simular progreso por pasos
    let stepIndex = 0;
    let progressValue = 0;

    const advanceStep = () => {
      if (stepIndex < LOADING_STEPS.length) {
        setCurrentStep(stepIndex);
        progressValue = ((stepIndex + 1) / LOADING_STEPS.length) * 100;
        setProgress(progressValue);
        stepIndex++;

        if (stepIndex < LOADING_STEPS.length) {
          setTimeout(advanceStep, LOADING_STEPS[stepIndex - 1].duration);
        }
      }
    };

    advanceStep();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="loading-modal-overlay">
      <div className="loading-modal">
        {error ? (
          <>
            <div className="loading-modal__icon error">✕</div>
            <h3 className="loading-modal__title error">Error</h3>
            <p className="loading-modal__error">{error}</p>
          </>
        ) : (
          <>
            <div className="loading-modal__spinner" />
            <h3 className="loading-modal__title">Buscando avistamientos</h3>
            
            <div className="loading-modal__steps">
              {LOADING_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`loading-modal__step ${
                    index < currentStep ? "completed" : 
                    index === currentStep ? "active" : ""
                  }`}
                >
                  <span className="step-indicator">
                    {index < currentStep ? "✓" : index + 1}
                  </span>
                  <span className="step-text">{step.text}</span>
                </div>
              ))}
            </div>

            <div className="loading-modal__progress-bar">
              <div 
                className="loading-modal__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
