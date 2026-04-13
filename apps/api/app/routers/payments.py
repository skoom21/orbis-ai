"""
Stripe payment integration router.

Endpoints:
  POST /api/v1/payments/intent       - create Stripe PaymentIntent
  POST /api/v1/payments/{id}/confirm - confirm a payment
  POST /api/v1/payments/{id}/refund  - refund a payment
  GET  /api/v1/payments              - list user payments
  POST /api/v1/webhooks/stripe       - Stripe webhook handler
"""

import os
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.api.dependencies.auth import get_optional_user
from app.services.database import db_service
from app.logging_config import get_logger

logger = get_logger("api.payments")

router = APIRouter(prefix="/payments", tags=["payments"])
webhook_router = APIRouter(prefix="/webhooks", tags=["webhooks"])

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def _get_stripe():
    """Return stripe module configured with secret key, or raise if not set."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured. Set STRIPE_SECRET_KEY.")
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PaymentIntentCreate(BaseModel):
    trip_id: str
    amount: float           # Amount in USD (will be converted to cents)
    currency: str = "usd"
    payment_method_types: List[str] = ["card"]


class PaymentRefund(BaseModel):
    amount: Optional[float] = None   # Partial refund amount; None = full refund
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/intent")
async def create_payment_intent(
    data: PaymentIntentCreate,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Create a Stripe PaymentIntent and record it in the database."""
    user_id = current_user["id"]
    stripe = _get_stripe()
    try:
        # Convert to smallest currency unit (cents for USD)
        amount_cents = int(data.amount * 100)
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=data.currency,
            payment_method_types=data.payment_method_types,
            metadata={"trip_id": data.trip_id, "user_id": user_id},
        )

        if db_service.supabase:
            db_service.supabase.table("payments").insert({
                "user_id": user_id,
                "trip_id": data.trip_id,
                "amount": data.amount,
                "currency": data.currency,
                "provider_payment_id": intent["id"],
                "status": "pending",
                "payment_method": "stripe",
            }).execute()

        return {
            "payment_intent_id": intent["id"],
            "client_secret": intent["client_secret"],
            "amount": data.amount,
            "currency": data.currency,
        }
    except Exception as e:
        logger.error("create_payment_intent error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Mark a payment as succeeded (called after client-side confirmation)."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        result = db_service.supabase.table("payments") \
            .update({"status": "succeeded"}) \
            .eq("id", payment_id) \
            .eq("user_id", user_id) \
            .execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=404, detail="Payment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    data: PaymentRefund = PaymentRefund(),
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Refund a payment via Stripe and update the database."""
    user_id = current_user["id"]
    stripe = _get_stripe()
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")

        payment = db_service.supabase.table("payments") \
            .select("provider_payment_id, amount, currency") \
            .eq("id", payment_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        if not payment.data:
            raise HTTPException(status_code=404, detail="Payment not found")

        provider_id = payment.data.get("provider_payment_id")
        refund_params: Dict[str, Any] = {"payment_intent": provider_id}
        if data.amount:
            refund_params["amount"] = int(data.amount * 100)

        refund = stripe.Refund.create(**refund_params)

        db_service.supabase.table("payments") \
            .update({
                "status": "refunded",
                "refund_amount": data.amount or payment.data.get("amount"),
                "refund_reason": data.reason,
            }) \
            .eq("id", payment_id) \
            .execute()

        return {"status": "refunded", "refund_id": refund["id"], "payment_id": payment_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("refund_payment error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_payments(
    trip_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_optional_user),
):
    """Get payment history for the current user."""
    user_id = current_user["id"]
    try:
        if not db_service.supabase:
            raise HTTPException(status_code=503, detail="Database unavailable")
        query = db_service.supabase.table("payments") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True)
        if trip_id:
            query = query.eq("trip_id", trip_id)
        result = query.execute()
        return {"payments": result.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Stripe Webhook
# ---------------------------------------------------------------------------

@webhook_router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
):
    """Handle Stripe webhook events (payment success, refunds)."""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    payload = await request.body()
    stripe = _get_stripe()

    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        logger.error("Stripe webhook signature validation failed", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data_obj = event["data"]["object"]

    try:
        if event_type == "payment_intent.succeeded":
            provider_id = data_obj.get("id")
            if db_service.supabase and provider_id:
                db_service.supabase.table("payments") \
                    .update({"status": "succeeded"}) \
                    .eq("provider_payment_id", provider_id) \
                    .execute()
                logger.info("Payment succeeded via webhook", provider_id=provider_id)

        elif event_type == "payment_intent.payment_failed":
            provider_id = data_obj.get("id")
            if db_service.supabase and provider_id:
                db_service.supabase.table("payments") \
                    .update({"status": "failed"}) \
                    .eq("provider_payment_id", provider_id) \
                    .execute()
                logger.info("Payment failed via webhook", provider_id=provider_id)

        elif event_type == "charge.refunded":
            payment_intent_id = data_obj.get("payment_intent")
            if db_service.supabase and payment_intent_id:
                db_service.supabase.table("payments") \
                    .update({"status": "refunded"}) \
                    .eq("provider_payment_id", payment_intent_id) \
                    .execute()
                logger.info("Charge refunded via webhook", payment_intent_id=payment_intent_id)

    except Exception as e:
        logger.error("Webhook processing error", event_type=event_type, error=str(e))

    return {"received": True}
