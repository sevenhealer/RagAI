# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY backend_v2/app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all app files
COPY backend_v2/app .

# Expose the FastAPI port
EXPOSE 8000

# Start the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]