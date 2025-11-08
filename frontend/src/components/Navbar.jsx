import { Navbar as BSNavbar, Nav, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    return(
        <BSNavbar expand="lg" className="custom-navbar">
            <Container fluid>
                <BSNavbar.Brand as={Link} to="/home">
                    BioGeoVis
                </BSNavbar.Brand>
                <BSNavbar.Toggle aria-controls="navbarSupportedContent" />
                <BSNavbar.Collapse id="navbarSupportedContent">
                    <Nav className="me-auto mb-2 mb-lg-0">
                        <Nav.Link as={Link} to="/home">Inicio</Nav.Link>
                        <Nav.Link as={Link} to="/explorer">Explorador</Nav.Link>
                        <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
                        <Nav.Link as={Link} to="/about">Acerca de</Nav.Link>
                    </Nav>
                </BSNavbar.Collapse>
            </Container>
        </BSNavbar>
    )
}

export default Navbar;