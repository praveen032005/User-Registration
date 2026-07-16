import base64
import logging
import os
import re
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("registration-backend")

# Load environment variables
load_dotenv()

app = FastAPI(
    title="User Registration Backend",
    description="FastAPI backend to validate user registration data and forward to Power Automate",
    version="1.0.0"
)

# CORS configuration
allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration / Env Variables
POWER_AUTOMATE_URL = os.getenv("POWER_AUTOMATE_URL")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB limit
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png"}

# Email validation regex
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# Allowed blood groups
ALLOWED_BLOOD_GROUPS = {"O-", "O+", "A+", "A-", "B-", "B+", "AB-", "AB+"}

# Date structure validation (YYYY-MM-DD)
DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {
        "status": "healthy",
        "power_automate_configured": POWER_AUTOMATE_URL is not None and len(POWER_AUTOMATE_URL) > 0
    }

@app.get("/fetch", status_code=status.HTTP_200_OK)
async def fetch_trainee(query: str):
    query = query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification ID or Phone Number cannot be empty."
        )

    if not POWER_AUTOMATE_URL:
        logger.error("POWER_AUTOMATE_URL environment variable is not configured.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backend service configuration error (Power Automate endpoint missing)."
        )

    payload = {
        "action": "fetch",
        "query": query
    }

    logger.info(f"Querying Power Automate for trainee look-up: '{query}'...")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                POWER_AUTOMATE_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            
            if response.status_code not in (200, 201, 202):
                logger.error(
                    f"Power Automate returned an error: Code {response.status_code}, Body: {response.text}"
                )
                raise HTTPException(
                    status_code=status.HTTP_520_WEBSERVER_ERR,
                    detail="Failed to fetch trainee details. The look-up service returned an error."
                )
                
            data = response.json()
            return data
            
    except httpx.RequestError as exc:
        logger.error(f"HTTP request to Power Automate failed: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach the registration storage service. Please try again later."
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error when querying Power Automate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while looking up trainee."
        )

@app.post("/submit", status_code=status.HTTP_200_OK)
async def submit_registration(
    id: str = Form(..., description="SharePoint list item ID of the trainee"),
    bloodGroup: str = Form(..., description="Trainee blood group"),
    dob: str = Form(..., description="Trainee date of birth (YYYY-MM-DD)"),
    dateOfJoin: str = Form(..., description="Trainee date of joining (YYYY-MM-DD)"),
    photo: UploadFile = File(..., description="User's profile photo (JPEG/PNG, max 5MB)")
):
    # 1. Validation
    id = id.strip()
    bloodGroup = bloodGroup.strip().upper().replace("=", "+")
    dob = dob.strip()
    dateOfJoin = dateOfJoin.strip()

    if not id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trainee ID is required."
        )

    if bloodGroup not in ALLOWED_BLOOD_GROUPS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid blood group: {bloodGroup}. Must be one of {', '.join(sorted(ALLOWED_BLOOD_GROUPS))}"
        )

    if not DATE_REGEX.match(dob):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date of Birth must be in YYYY-MM-DD format."
        )

    if not DATE_REGEX.match(dateOfJoin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date of Joining must be in YYYY-MM-DD format."
        )

    # Validate image content type
    content_type = photo.content_type
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {content_type}. Only JPEG, JPG, and PNG images are allowed."
        )

    # Validate file size
    try:
        photo_bytes = await photo.read()
        file_size = len(photo_bytes)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large: {file_size / (1024 * 1024):.2f}MB. Max allowed size is 5MB."
            )
            
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error reading uploaded file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing the uploaded image file."
        )

    # Convert photo to Base64 data URI
    try:
        base64_encoded = base64.b64encode(photo_bytes).decode("utf-8")
        photo_data_uri = f"data:{content_type};base64,{base64_encoded}"
    except Exception as e:
        logger.error(f"Error base64-encoding image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to encode image file."
        )

    # Check if Power Automate URL is configured
    if not POWER_AUTOMATE_URL:
        logger.error("POWER_AUTOMATE_URL environment variable is not configured.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backend service configuration error (Power Automate endpoint missing)."
        )

    # 2. Forward to Power Automate
    payload = {
        "action": "submit",
        "id": id,
        "bloodGroup": bloodGroup,
        "dob": dob,
        "dateOfJoin": dateOfJoin,
        "photo": photo_data_uri
    }

    logger.info(f"Forwarding profile completion for Trainee ID '{id}' to Power Automate...")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                POWER_AUTOMATE_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            
            if response.status_code not in (200, 201, 202):
                logger.error(
                    f"Power Automate returned an error: Code {response.status_code}, Body: {response.text}"
                )
                raise HTTPException(
                    status_code=status.HTTP_520_WEBSERVER_ERR,
                    detail="Failed to save profile. The registration storage service returned an error."
                )
                
            logger.info(f"Successfully updated trainee ID: {id}")
            return {
                "message": "Profile completed successfully!",
                "user": {
                    "id": id,
                    "bloodGroup": bloodGroup
                }
            }
            
    except httpx.RequestError as exc:
        logger.error(f"HTTP request to Power Automate failed: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach the registration storage service. Please try again later."
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error when sending to Power Automate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing registration."
        )

# Mount static files of the React frontend
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dist_dir = os.path.join(base_dir, "frontend", "dist")

if os.path.exists(frontend_dist_dir):
    logger.info(f"Serving static frontend files from: {frontend_dist_dir}")
    app.mount("/", StaticFiles(directory=frontend_dist_dir, html=True), name="static")
else:
    logger.warning(f"Static files directory not found at: {frontend_dist_dir}. Serving API only.")
