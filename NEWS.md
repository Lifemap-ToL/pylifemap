## pylifemap 0.2.1dev (development version)

## pylifemap 0.2.0

- Feature: add Arcs and Arcs deck layers
- Feature: add settings menu to dynamically switch theme and base Lifemap settings
- Feature: add `hide_legend` argument to Lifemap
- Feature: refactoring and documentation for JavaScript code reuse
- Feature: allow updating an existing Lifemap in JavaScript while keeping the current view
- Fix: error overlay positioning
- Fix: zoom reset now goes back to starting view
- Fix: parent coordinates not updated in lines layer
- Fix: lazy loading spinner styling with light theme

## pylifemap 0.1.3

- Fix: JavaScript bundling version problem
- Maint: upgrade Python dependencies

## pylifemap 0.1.2

- Feature: add small lazy loading spinner
- Feature: add progress text to global spinner
- Improvement: automatically enable lazy loading if a large dataset (> 300 000 rows) is detected
- Improvement: better lazy loading filter functions efficiency
- Improvement: better garbage collection when widget is destroyed
- Fix: arcs in donut charts must follow the categories order
- Fix: use sessionStorage instead of localStorage for updated coordinates caching
- Fix: wrong lazy loading extent margins computation
- Refactor: move projection computations to Python code

## pylifemap 0.1.1

- Improved default zoom level depending on widget size
- Improved animation when zooming into taxon

## pylifemap 0.1

- First published version
