# ExoVet

Classifies NASA Kepler Objects of Interest as planet candidates or false positives, with a neural network (MLP, default)
and a nearest-neighbours model (KNN). One Docker container serves the API and the web app.

```
docker build -t exovet .
docker run --rm -p 7860:7860 exovet      # http://localhost:7860
```

Deployed on Render from `render.yaml`. The API is `api/server.py`; the web app is in `web/`.
