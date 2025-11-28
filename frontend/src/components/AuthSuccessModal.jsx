import { useEffect, useState } from 'react';
import './AuthSuccessModal.css';

const AuthSuccessModal = ({ isOpen, onClose, userName, type = 'login' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Pequeño delay para la animación de entrada
            setTimeout(() => setIsVisible(true), 10);
            
            // Auto-cerrar después de 3 segundos
            const autoCloseTimer = setTimeout(() => {
                handleClose();
            }, 3000);

            return () => clearTimeout(autoCloseTimer);
        } else {
            setIsVisible(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
            onClose();
        }, 300);
    };

    if (!isOpen) return null;

    const getMessage = () => {
        if (type === 'register') {
            return {
                title: '¡Registro exitoso!',
                subtitle: `Bienvenido/a a BioGeoVis, ${userName}`,
                description: 'Tu cuenta ha sido creada correctamente.'
            };
        }
        return {
            title: '¡Bienvenido/a de vuelta!',
            subtitle: `Hola, ${userName}`,
            description: 'Has iniciado sesión correctamente.'
        };
    };

    const message = getMessage();

    return (
        <div 
            className={`auth-modal-overlay ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}
            onClick={handleClose}
        >
            <div 
                className={`auth-modal-content ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="auth-modal-icon">
                    <svg 
                        className="checkmark" 
                        viewBox="0 0 52 52"
                        aria-hidden="true"
                    >
                        <circle 
                            className="checkmark-circle" 
                            cx="26" 
                            cy="26" 
                            r="25" 
                            fill="none"
                        />
                        <path 
                            className="checkmark-check" 
                            fill="none" 
                            d="M14.1 27.2l7.1 7.2 16.7-16.8"
                        />
                    </svg>
                </div>
                
                <h2 className="auth-modal-title">{message.title}</h2>
                <p className="auth-modal-subtitle">{message.subtitle}</p>
                <p className="auth-modal-description">{message.description}</p>
                
                <button 
                    className="auth-modal-button"
                    onClick={handleClose}
                >
                    Continuar
                </button>

                <div className="auth-modal-progress">
                    <div className="auth-modal-progress-bar"></div>
                </div>
            </div>
        </div>
    );
};

export default AuthSuccessModal;
