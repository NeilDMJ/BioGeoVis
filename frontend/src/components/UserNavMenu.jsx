import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UserNavMenu.css';

const UserNavMenu = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        navigate('/home');
    };

    const getInitials = () => {
        if (!user) return '?';
        const first = user.firstName?.charAt(0)?.toUpperCase() || '';
        const last = user.lastName?.charAt(0)?.toUpperCase() || '';
        return first + last || user.email?.charAt(0)?.toUpperCase() || '?';
    };

    const getDisplayName = () => {
        if (!user) return '';
        if (user.firstName) {
            return user.firstName;
        }
        return user.username || user.email?.split('@')[0] || '';
    };

    if (!isAuthenticated) {
        return (
            <Link to="/login" className="home__nav-link nav-login-cta">
                Iniciar sesión
            </Link>
        );
    }

    return (
        <div className="user-nav-menu" ref={menuRef}>
            <button 
                className="user-nav-trigger"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
            >
                <div className="user-avatar">
                    {getInitials()}
                </div>
                <span className="user-name">{getDisplayName()}</span>
                <svg 
                    className={`user-nav-chevron ${isMenuOpen ? 'open' : ''}`}
                    viewBox="0 0 24 24" 
                    width="16" 
                    height="16"
                    aria-hidden="true"
                >
                    <path 
                        d="M6 9l6 6 6-6" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isMenuOpen && (
                <div className="user-nav-dropdown">
                    <div className="user-nav-header">
                        <div className="user-avatar user-avatar--large">
                            {getInitials()}
                        </div>
                        <div className="user-nav-info">
                            <span className="user-nav-fullname">
                                {user?.firstName} {user?.lastName}
                            </span>
                            <span className="user-nav-email">{user?.email}</span>
                        </div>
                    </div>
                    
                    <div className="user-nav-divider"></div>
                    
                    <nav className="user-nav-links">
                        <Link 
                            to="/dashboard" 
                            className="user-nav-item"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm0 9h7v7h-7v-7zm-9 0h7v7H4v-7z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            Dashboard
                        </Link>
                        <Link 
                            to="/explorer" 
                            className="user-nav-item"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            Explorador
                        </Link>
                    </nav>
                    
                    <div className="user-nav-divider"></div>
                    
                    <button 
                        className="user-nav-logout"
                        onClick={handleLogout}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserNavMenu;
