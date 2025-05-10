import os
from dotenv import load_dotenv
import vertexai
from google import genai
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

PROJECT_ID = os.getenv("PROJECT_ID")
LOCATION = os.getenv("LOCATION")
CREDENTIALS_PATH = os.getenv("CREDENTIALS_PATH")

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH

vertexai.init(project=PROJECT_ID, location=LOCATION)
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

mongo_client = MongoClient(os.getenv("MONGO_URI"))
db = mongo_client["ragai"]
users = db["users"]