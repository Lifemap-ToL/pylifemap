get_lmdata:
    uv run scripts/prepare_lmdata.py

test:
    uv run pytest

doc: 
    cd doc && \
    uv run quartodoc build && \
    uv run quartodoc interlinks && \
    uv run quarto render
