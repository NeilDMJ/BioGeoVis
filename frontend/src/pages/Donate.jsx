import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import UserNavMenu from '../components/UserNavMenu';
import './Donate.css';

// Carga tu clave pública de Stripe (reemplaza con tu clave real)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51...');

const DONATION_AMOUNTS = [
  { value: 500, label: '$5', description: 'Café' },
  { value: 1000, label: '$10', description: 'Apoyo básico' },
  { value: 2500, label: '$25', description: 'Contribución' },
  { value: 5000, label: '$50', description: 'Soporte sustancial' },
  { value: 10000, label: '$100', description: 'Patrocinador' }
];

function DonationForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [donorInfo, setDonorInfo] = useState({
    name: '',
    email: '',
    message: ''
  });

  const amount = useCustom && customAmount 
    ? Math.round(parseFloat(customAmount) * 100) 
    : selectedAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      
      // 1. Crear PaymentIntent en el backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/donations/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'usd',
          donor_name: donorInfo.name,
          donor_email: donorInfo.email,
          donor_message: donorInfo.message || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear el pago');
      }

      const { client_secret } = await response.json();

      // 2. Confirmar el pago con Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: donorInfo.name,
              email: donorInfo.email,
            },
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        setSuccess(true);
      } else {
        throw new Error('El pago no pudo ser completado');
      }
      
    } catch (err) {
      setError(err.message || 'Error al procesar la donación');
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="donation-success">
        <div className="success-icon">✓</div>
        <h2>¡Gracias por tu donación!</h2>
        <p>Tu contribución de <strong>${(amount / 100).toFixed(2)}</strong> ayuda a mantener BioGeoVis funcionando.</p>
        <p className="success-message">
          {donorInfo.name}, hemos enviado un recibo a <strong>{donorInfo.email}</strong>
        </p>
        {donorInfo.message && (
          <div className="donor-message">
            <p className="eyebrow">Tu mensaje:</p>
            <p>"{donorInfo.message}"</p>
          </div>
        )}
        <div className="success-actions">
          <Button as={Link} to="/" variant="primary">
            Volver al inicio
          </Button>
          <Button 
            variant="outline-primary" 
            onClick={() => setSuccess(false)}
          >
            Hacer otra donación
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="donation-form">
      <section className="donation-section">
        <h3>Selecciona un monto</h3>
        <div className="amount-grid">
          {DONATION_AMOUNTS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`amount-card ${!useCustom && selectedAmount === item.value ? 'selected' : ''}`}
              onClick={() => {
                setSelectedAmount(item.value);
                setUseCustom(false);
              }}
            >
              <span className="amount-value">{item.label}</span>
              <span className="amount-desc">{item.description}</span>
            </button>
          ))}
          <button
            type="button"
            className={`amount-card custom ${useCustom ? 'selected' : ''}`}
            onClick={() => setUseCustom(true)}
          >
            <span className="amount-value">Otro</span>
            <span className="amount-desc">Monto personalizado</span>
          </button>
        </div>

        {useCustom && (
          <div className="custom-amount">
            <label htmlFor="customAmount">Monto personalizado (USD)</label>
            <input
              id="customAmount"
              type="number"
              min="1"
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Ingresa el monto"
              required
            />
          </div>
        )}
      </section>

      <section className="donation-section">
        <h3>Información del donante</h3>
        <div className="form-group">
          <label htmlFor="name">Nombre completo</label>
          <input
            id="name"
            type="text"
            value={donorInfo.name}
            onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
            placeholder="Juan Pérez"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={donorInfo.email}
            onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
            placeholder="juan@ejemplo.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="message">Mensaje (opcional)</label>
          <textarea
            id="message"
            value={donorInfo.message}
            onChange={(e) => setDonorInfo({ ...donorInfo, message: e.target.value })}
            placeholder="Comparte por qué apoyas este proyecto..."
            rows="3"
          />
        </div>
      </section>

      <section className="donation-section">
        <h3>Información de pago</h3>
        <div className="card-element-container">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#333',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#dc3545',
                },
              },
            }}
          />
        </div>
      </section>

      {error && (
        <div className="donation-error">
          <span className="error-icon">⚠</span>
          {error}
        </div>
      )}

      <div className="donation-total">
        <span>Total a donar:</span>
        <strong>${(amount / 100).toFixed(2)} USD</strong>
      </div>

      <Button 
        type="submit" 
        variant="primary" 
        size="lg" 
        disabled={!stripe || processing}
        className="donate-btn"
      >
        {processing ? 'Procesando...' : `Donar $${(amount / 100).toFixed(2)}`}
      </Button>

      <p className="donation-disclaimer">
        Tu donación es segura. Usamos Stripe para procesar pagos de forma encriptada.
      </p>
    </form>
  );
}

function Donate() {
  return (
    <div className="donate-page">
      <header className="mapview__nav" aria-label="Navegación">
        <div className="home__logo">BioGeoVis</div>
        <nav className="home__nav-links">
          <Link to="/" className="home__nav-link">Inicio</Link>
          <Link to="/explorer" className="home__nav-link">Explorador</Link>
          <Link to="/dashboard" className="home__nav-link">Dashboard</Link>
          <Link to="/about" className="home__nav-link">Acerca de Nosotros</Link>
          <UserNavMenu />
        </nav>
      </header>

      <main className="donate-content">
        <div className="donate-hero">
          <h1>Apoya BioGeoVis</h1>
          <p className="lead">
            Tu donación nos ayuda a mantener esta plataforma gratuita y en constante mejora
            para científicos, investigadores y amantes de la biodiversidad.
          </p>
        </div>

        <div className="donate-container">
          <div className="donate-main">
            <Elements stripe={stripePromise}>
              <DonationForm />
            </Elements>
          </div>

          <aside className="donate-sidebar">
            <div className="impact-card">
              <h3>Tu impacto</h3>
              <ul className="impact-list">
                <li>
                  <span className="impact-icon">🌍</span>
                  <div>
                    <strong>Hosting y servidores</strong>
                    <p>Mantener +800K avistamientos disponibles 24/7</p>
                  </div>
                </li>
                <li>
                  <span className="impact-icon">🔬</span>
                  <div>
                    <strong>APIs científicas</strong>
                    <p>Acceso a datos actualizados de GBIF e iNaturalist</p>
                  </div>
                </li>
                <li>
                  <span className="impact-icon">🚀</span>
                  <div>
                    <strong>Nuevas funciones</strong>
                    <p>Desarrollo de herramientas de análisis avanzadas</p>
                  </div>
                </li>
                <li>
                  <span className="impact-icon">🎓</span>
                  <div>
                    <strong>Educación libre</strong>
                    <p>Acceso gratuito para estudiantes e investigadores</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="recognition-card">
              <h3>Reconocimiento</h3>
              <p>
                Los donantes que contribuyan con $50 o más serán reconocidos en nuestra
                página de colaboradores (opcional).
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Donate;
