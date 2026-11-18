# ExoVet: one container that serves the API (both models) and the built web app.
#
#   docker build -t exovet .
#   docker run --rm -p 7860:7860 exovet          then open http://localhost:7860
#
# Stage 1 builds the React app. Stage 2 is a slim Python image with only what prediction needs: no TensorFlow
# (the MLP runs on numpy from models/exovet_network_weights.npz), no SDV, no torch, no notebooks.

# ---------- Stage 1: build the web app ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---------- Stage 2: the server ----------
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    EXOVET_HOST=0.0.0.0 \
    EXOVET_PORT=7860

# Hugging Face Spaces runs containers as user 1000; a non-root user is good practice anywhere
RUN useradd --create-home --uid 1000 user
WORKDIR /app

COPY requirements-deploy.txt ./
RUN pip install -r requirements-deploy.txt

COPY exovet_features.py ./
COPY api/server.py api/server.py
COPY models/exovet_network_preparation.joblib models/exovet_network_preparation.joblib
COPY models/exovet_network_weights.npz models/exovet_network_weights.npz
COPY models/final/exovet_final_model.joblib models/final/exovet_final_model.joblib
COPY data/processed/train.csv data/processed/train.csv
COPY data/processed/test.csv data/processed/test.csv
COPY data/final/train.csv data/final/train.csv
COPY data/final/test.csv data/final/test.csv
COPY --from=web /web/dist web/dist

RUN chown -R user:user /app
USER user

EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD python -c "import os,urllib.request as u;u.urlopen('http://127.0.0.1:'+(os.environ.get('PORT') or os.environ['EXOVET_PORT'])+'/api/health',timeout=4)"

CMD ["python", "api/server.py"]
