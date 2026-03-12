# Use the official lightweight hon image
FROM python:3.13-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code into the container
COPY . .

# Cloud Run defaults to port 8080, so we tell uvicorn to listen there
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]