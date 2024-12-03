#!/bin/bash

if [ -n "$1" ]; then
    echo "Running Python script ${1}"
    PYLIFEMAP_DOCKER=1 python $1
else
    echo "Starting Jupyter Lab"
    uv run --no-sync --frozen jupyter-lab --ip=0.0.0.0 --port=8899 --allow-root --LabApp.token="" --no-browser /local
fi

exit 0