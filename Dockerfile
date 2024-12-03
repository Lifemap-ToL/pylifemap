# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim


# Copy package files
COPY src/ /app/src/
COPY LICENSE /app/LICENSE
COPY README.md /app/README.md
COPY pyproject.toml /app/pyproject.toml
COPY uv.lock /app/uv.lock
# Copy start script
COPY docker/start.sh /opt/start.sh

# Install the project into `/app`
WORKDIR /app
RUN uv sync --frozen --dev --no-editable

ENTRYPOINT ["bash", "/opt/start.sh"]

