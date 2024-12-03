get_lmdata:
    Rscript scripts/01_get_lmdata.R
    uv run scripts/02_prepare_lmdata.py

test:
    uv run pytest

doc: 
    cd doc && \
    uv run quartodoc build && \
    uv run quartodoc interlinks && \
    uv run quarto render
