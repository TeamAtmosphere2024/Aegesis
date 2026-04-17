import razorpay
import os
import uuid
import logging
from dotenv import load_dotenv

load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_your_id")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "your_secret")

class RazorpayPayoutService:
    @staticmethod
    def create_payout(rider_id: int, amount_inr: float):
        return {
            "status": "success",
            "payout_id": f"pout_{uuid.uuid4().hex[:12]}",
            "amount": amount_inr
        }

payout_service = RazorpayPayoutService()
