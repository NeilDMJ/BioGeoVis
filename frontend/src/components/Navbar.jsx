
import { Navbar as BSNavbar, Nav, NavDropdown, Form, Button, Container } from 'react-bootstrap';
import './Navbar.css';

const Navbar = () => {
    return(
        <BSNavbar expand="lg" className="custom-navbar">
            <Container fluid>
                <BSNavbar.Brand href="/home">BioGeoVis</BSNavbar.Brand>
                <BSNavbar.Toggle aria-controls="navbarSupportedContent" />
                <BSNavbar.Collapse id="navbarSupportedContent">
                    <Nav className="me-auto mb-2 mb-lg-0">
                        <Nav.Link href="/map" active>Mapa</Nav.Link>
                        <Nav.Link href="/explorer">Explorar</Nav.Link>
                        <NavDropdown title="Dropdown" id="basic-nav-dropdown">
                            <NavDropdown.Item href="#">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#">Another action</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#">Something else here</NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                    <Form className="d-flex" role="search">
                        <Form.Control
                            type="search"
                            placeholder="Buscar coordenadas"
                            className="me-2"
                            aria-label="Search"
                        />
                        <Button variant="outline-success" type="submit">Buscar</Button>
                    </Form>
                </BSNavbar.Collapse>
            </Container>
        </BSNavbar>
    )
}

export default Navbar;
