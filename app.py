"""CashFlowPilot onboarding prototype.

This endpoint verifies a business PAN/GSTIN through Decentro. It is NOT a complete
user-authentication system: do not grant dashboard access until owner/mobile OTP
verification, account persistence, authorization, and secure sessions are implemented.
"""
import os
import re
import uuid
from difflib import SequenceMatcher

import requests
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

DECENTRO_BASE_URL = os.getenv(
    "DECENTRO_BASE_URL", "https://in.staging.decentro.tech"
).rstrip("/")
DECENTRO_CLIENT_ID = os.getenv("DECENTRO_CLIENT_ID", "")
DECENTRO_CLIENT_SECRET = os.getenv("DECENTRO_CLIENT_SECRET", "")
VERIFY_TIMEOUT_SECONDS = 15


@app.get("/")
def home():
    return send_from_directory(".", "login.html")


def normalize_name(value):
    """Normalize names for a cautious comparison, retaining letters and digits."""
    return re.sub(r"[^A-Z0-9]", "", (value or "").upper())


@app.post("/api/verify-business")
def verify_business():
    data = request.get_json(silent=True) or {}
    owner_name = str(data.get("owner_name", "")).strip()
    mobile = re.sub(r"\D", "", str(data.get("mobile", "")))
    business_name = str(data.get("business_name", "")).strip()
    document_type = str(data.get("document_type", "")).upper().strip()
    id_number = re.sub(r"\s+", "", str(data.get("id_number", "")).upper())
    consent = data.get("consent") is True

    if not all([owner_name, business_name, id_number]) or not re.fullmatch(r"[6-9]\d{9}", mobile):
        return jsonify(verified=False, message="Enter a name, registered business name, and valid 10-digit Indian mobile number."), 400
    if not consent:
        return jsonify(verified=False, message="Consent is required before checking the business document."), 400
    if document_type not in {"PAN", "GSTIN"}:
        return jsonify(verified=False, message="Choose PAN or GSTIN."), 400
    if document_type == "PAN" and not re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", id_number):
        return jsonify(verified=False, message="The PAN format is invalid. Check the 10-character business PAN."), 400
    if document_type == "GSTIN" and not re.fullmatch(r"\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]", id_number):
        return jsonify(verified=False, message="The GSTIN format is invalid. Check the 15-character GSTIN."), 400

    if not DECENTRO_CLIENT_ID or not DECENTRO_CLIENT_SECRET:
        return jsonify(
            verified=False,
            message="Decentro is not configured on the server. Set DECENTRO_CLIENT_ID and DECENTRO_CLIENT_SECRET."
        ), 503

    payload = {
        "reference_id": str(uuid.uuid4()),
        "document_type": document_type,
        "id_number": id_number,
        "consent": "Y",
        "consent_purpose": "Verify business registration for CashFlowPilot onboarding"
    }
    headers = {
        "client_id": DECENTRO_CLIENT_ID,
        "client_secret": DECENTRO_CLIENT_SECRET,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        api_response = requests.post(
            f"{DECENTRO_BASE_URL}/kyc/public_registry/validate",
            json=payload,
            headers=headers,
            timeout=VERIFY_TIMEOUT_SECONDS
        )
    except requests.RequestException:
        app.logger.warning("Decentro business verification request failed.")
        return jsonify(verified=False, message="The verification provider could not be reached. Please try again later."), 502

    if api_response.status_code >= 500:
        return jsonify(verified=False, message="The verification provider is temporarily unavailable."), 502
    if api_response.status_code >= 400:
        return jsonify(verified=False, message="Decentro could not validate these details. Check the document and try again."), 400

    try:
        provider_data = api_response.json()
    except ValueError:
        return jsonify(verified=False, message="The verification provider returned an unreadable response."), 502

    kyc_result = provider_data.get("kycResult") or {}
    provider_status = str(provider_data.get("kycStatus") or provider_data.get("status") or "").upper()
    if provider_status != "SUCCESS":
        return jsonify(verified=False, message="The business document was not verified. Check the details or contact support."), 200

    if document_type == "PAN":
        official_name = str(kyc_result.get("name") or kyc_result.get("fullName") or "").strip()
        document_status = str(kyc_result.get("idStatus") or "").upper()
        document_is_valid = document_status in {"VALID", "ACTIVE"}
    else:
        official_name = str(kyc_result.get("legalName") or kyc_result.get("tradeName") or "").strip()
        document_status = str(kyc_result.get("gstnStatus") or "").upper()
        # Some API responses may omit this optional status; a successful response
        # with a returned legal name is reported as a document match, not owner auth.
        document_is_valid = document_status in {"ACTIVE", "VALID"} or (
            not document_status and bool(official_name)
        )

    entered = normalize_name(business_name)
    official = normalize_name(official_name)
    name_matches = bool(entered and official and (
        entered == official or SequenceMatcher(None, entered, official).ratio() >= 0.92
    ))
    verified = bool(document_is_valid and name_matches)

    if verified:
        message = "Business document verified and the entered business name matches the provider record."
    elif not official_name:
        message = "The document check returned no business name to compare. Review the document details or contact support."
    elif not name_matches:
        message = "The document was checked, but the entered business name does not sufficiently match the official record."
    else:
        message = "The business document did not return an active/valid status."

    # Do not log or return the submitted ID number or the full provider response.
    return jsonify(
        verified=verified,
        message=message,
        official_business_name=official_name if verified else None,
        next_step="mobile_otp_required"
    ), 200


if __name__ == "__main__":
    # Local development only. Use a production WSGI server and HTTPS in deployment.
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "8000")), debug=False)
