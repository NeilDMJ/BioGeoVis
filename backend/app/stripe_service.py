import stripe
import os
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from fastapi import HTTPException

# Configurar Stripe con la clave secreta
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

class DonationRequest(BaseModel):
    amount: int = Field(..., gt=0, description="Monto en centavos (ej. 1000 = $10)")
    currency: str = Field(default="usd", description="Moneda del pago")
    donor_name: str = Field(..., min_length=1, max_length=100)
    donor_email: EmailStr
    donor_message: Optional[str] = Field(None, max_length=500)

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str

class WebhookEvent(BaseModel):
    type: str
    data: dict

async def create_payment_intent(donation: DonationRequest) -> PaymentIntentResponse:
    """
    Crea un PaymentIntent de Stripe para procesar la donación
    """
    try:
        # Crear el PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=donation.amount,
            currency=donation.currency,
            automatic_payment_methods={'enabled': True},
            metadata={
                'donor_name': donation.donor_name,
                'donor_email': donation.donor_email,
                'donor_message': donation.donor_message or '',
                'purpose': 'biogeovis_donation'
            },
            description=f"Donación de {donation.donor_name} para BioGeoVis",
            receipt_email=donation.donor_email,
        )

        return PaymentIntentResponse(
            client_secret=intent.client_secret,
            payment_intent_id=intent.id
        )
    
    except stripe.error.CardError as e:
        # Error con la tarjeta
        raise HTTPException(status_code=400, detail=f"Error de tarjeta: {e.user_message}")
    
    except stripe.error.RateLimitError as e:
        # Demasiadas peticiones
        raise HTTPException(status_code=429, detail="Demasiadas peticiones, intenta más tarde")
    
    except stripe.error.InvalidRequestError as e:
        # Parámetros inválidos
        raise HTTPException(status_code=400, detail=f"Petición inválida: {str(e)}")
    
    except stripe.error.AuthenticationError as e:
        # Error de autenticación con Stripe
        raise HTTPException(status_code=500, detail="Error de autenticación con el procesador de pagos")
    
    except stripe.error.APIConnectionError as e:
        # Error de red
        raise HTTPException(status_code=503, detail="Error de conexión con el procesador de pagos")
    
    except stripe.error.StripeError as e:
        # Error genérico de Stripe
        raise HTTPException(status_code=500, detail=f"Error del procesador de pagos: {str(e)}")
    
    except Exception as e:
        # Error inesperado
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

async def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """
    Verifica la firma del webhook de Stripe para asegurar que viene de Stripe
    En desarrollo (sin STRIPE_WEBHOOK_SECRET), permite webhooks sin verificación
    """
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    # Modo desarrollo: permitir sin verificación
    if not webhook_secret:
        import json
        return json.loads(payload)
    
    # Modo producción: verificar firma
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        return event
    
    except ValueError as e:
        # Payload inválido
        raise HTTPException(status_code=400, detail="Payload inválido")
    
    except stripe.error.SignatureVerificationError as e:
        # Firma inválida
        raise HTTPException(status_code=400, detail="Firma de webhook inválida")

async def handle_payment_intent_succeeded(payment_intent: dict):
    """
    Maneja el evento cuando un pago es exitoso
    Aquí puedes guardar la donación en la base de datos, enviar emails, etc.
    """
    metadata = payment_intent.get('metadata', {})
    amount = payment_intent.get('amount', 0)
    
    print(f"✅ Pago exitoso!")
    print(f"   Donante: {metadata.get('donor_name')}")
    print(f"   Email: {metadata.get('donor_email')}")
    print(f"   Monto: ${amount / 100}")
    print(f"   Mensaje: {metadata.get('donor_message')}")
    
    # TODO: Guardar en MongoDB
    # donation_data = {
    #     'donor_name': metadata.get('donor_name'),
    #     'donor_email': metadata.get('donor_email'),
    #     'amount': amount,
    #     'currency': payment_intent.get('currency'),
    #     'message': metadata.get('donor_message'),
    #     'payment_intent_id': payment_intent.get('id'),
    #     'created_at': datetime.now(),
    #     'status': 'succeeded'
    # }
    # await db.donations.insert_one(donation_data)
    
    # TODO: Enviar email de confirmación
    # await send_donation_confirmation_email(metadata.get('donor_email'), amount)
    
    return {"status": "processed"}

async def handle_payment_intent_failed(payment_intent: dict):
    """
    Maneja el evento cuando un pago falla
    """
    metadata = payment_intent.get('metadata', {})
    
    print(f"❌ Pago fallido!")
    print(f"   Donante: {metadata.get('donor_name')}")
    print(f"   Email: {metadata.get('donor_email')}")
    
    # TODO: Registrar el intento fallido
    # TODO: Enviar email notificando el fallo (opcional)
    
    return {"status": "failed"}
