import { Link } from "react-router-dom";

const Sidebar = () => {
    return (
        <div className="sidebar">
            <ul>
                <li>
                    <Link to="/home">Pagina principal</Link></li>
                <li>
                    <Link to="/explorer">Explorar</Link></li>
                <li>
                    <Link to="/map">Mapa interactivo</Link></li>
            </ul>
        </div >
    )
}

export default Sidebar;
