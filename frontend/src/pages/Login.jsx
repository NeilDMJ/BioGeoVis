import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Form, Container, Row, Col, Card } from 'react-bootstrap';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(''); // Limpiar error al escribir
    };

    const handleSubmit = async (e) => { 
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validación básica
        if (!formData.email || !formData.password) {
            setError('Por favor completa todos los campos');
            setLoading(false);
            return;
        }

        try {
            // Aquí llamarás a tu API de login
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            // const response = await fetch(`${API_URL}/api/login`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(formData)
            // });
            
            // Simulación de login (eliminar esto cuando tengas el backend)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Si login es exitoso, guardar token y redirigir
            // localStorage.setItem('token', response.token);
            navigate('/dashboard');
            
        } catch (err) {
            setError('Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <Container>
                <Row className="justify-content-center align-items-center min-vh-100">
                    <Col md={6} lg={5}>
                        <Card className="login-card">
                            <Card.Body className="p-5">
                                <div className="text-center mb-4">
                                    <h1 className="login-logo">BioGeoVis</h1>
                                    <p className="login-subtitle">Plataforma de Análisis de Biodiversidad</p>
                                </div>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Correo Electrónico</Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            placeholder="tu@email.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Contraseña</Form.Label>
                                        <Form.Control
                                            type="password"
                                            name="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            disabled={loading}
                                        />
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <Form.Check
                                            type="checkbox"
                                            label="Recordarme"
                                        />
                                        <Link to="/forgot-password" className="forgot-password-link">
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    </div>

                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="w-100 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                                    </Button>

                                    <div className="text-center">
                                        <span className="text-muted">¿No tienes cuenta? </span>
                                        <Link to="/register" className="register-link">
                                            Regístrate aquí
                                        </Link>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>

                        <div className="text-c enter mt-3">
                            <Link to="/home" className="back-to-home">
                                ← Volver al inicio
                            </Link>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;
