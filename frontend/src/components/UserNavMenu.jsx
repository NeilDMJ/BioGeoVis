import { Link } from 'react-router-dom';
import './UserNavMenu.css';

const UserNavMenu = () => {
    return (
        <div className="user-nav-simple">
            <Link to="/donate" className="home__nav-link nav-donate-cta">
                Apoyar proyecto
            </Link>
        </div>
    );
};

export default UserNavMenu;
