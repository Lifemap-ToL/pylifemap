FROM python:3.11-slim

# Install Python dependencies
RUN pip install -U pip setuptools wheel \
    && pip install hatch \
    && pip install jupyterlab

# Copy package files    
COPY src/ /opt/src/
COPY LICENSE /opt/LICENSE
COPY README.md /opt/README.md
COPY pyproject.toml /opt/pyproject.toml

# Install package
RUN pip install /opt

WORKDIR /local/

# Launch start script
COPY docker/start.sh /opt/start.sh
ENTRYPOINT ["bash", "/opt/start.sh"]
