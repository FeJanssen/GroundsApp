"""AWS Lambda Entrypoint – wrappt die FastAPI-App mit Mangum."""
from mangum import Mangum

from main import app

handler = Mangum(app)
