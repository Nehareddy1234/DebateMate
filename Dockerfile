FROM python:3.11-slim

# Set up non-root user for Hugging Face Spaces (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR $HOME/app

# Install dependencies
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy application files (including built frontend in frontend/dist)
COPY --chown=user:user . .

EXPOSE 7860

CMD ["python", "voice_server.py"]
