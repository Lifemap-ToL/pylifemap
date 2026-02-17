# Lifemap-js

This repository contains JavaScript code for Lifemap based visualizations, such as those used in [pylifemap](https://lifemap-tol.github.io/pylifemap/).

## Bundling

- Clone the `pylifemap` repository
- Run `npm install`
- Got to `packages/lifemap-js`
- Run `npm build`

You should now have a `dist` directory with `lifemap.js` and `lifemap.css` files.

## Usage

> [!NOTE]
> A complete example is provided in `example/index.html`

To use Lifemap JS code in a browser you have to include the bundled JS and CSS files:

```html
<link rel="stylesheet" href="./dist/lifemap.css" />
<script src="./dist/lifemap.js"></script>
```

Then, get the base lifemap element and initialize a `Lifemap` object with something like:

```js
// Get base element
const el = document.getElementById("map")

// Initialize Lifemap object
const lifemap = new Lifemap.Lifemap(el, {
    width: 800,
    height: 800,
    theme: "lightgrey",
})
```

After that you have to create a `data` and a `layers` object and then update your lifemap object with:

```js
lifemap.update({ data: data, layers: layers })
```

## `data` object

The `data` object is a dictionary whose keys are layers identifiers, and values are dictionaries with two entries `serialized` and `value`:

- if `serialized` is `false`, value must be a data table in array of objects format (`[{col1: 1, col2: "A"}, {col1: 2, col2: "B"}, ...]`)
- if `serialized` is `true`, value must be a data table in Arrow IPC format

For data table corresponding to points data, the data table must contain the following columns:

- `pylifemap_taxid`: NCBI taxid
- `pylifemap_x`, `pylifemap_y`, `pylifemap_zoom`: the coordinates and zoom level
- any variable use for radius, fill color, etc.

For data table corresponding to lines data, the data table must contain the following columns:

- `pylifemap_taxid`, `pylifemap_parent`: NCBI taxids of both line points
- `pylifemap_x0`, `pylifemap_y0`, `pylifemap_x1`, `pylifemap_y1`, `pylifemap_zoom`: the coordinates and zoom level of the line
- any variable use for width, color, etc.

For counts data table used for the donuts layer, there must be a counts column containing a dictionary of counts. Something like:

```js
[{value1: 15, value2: 3}, {value1: 0, value2: 7}, ...]
```

### Note on taxids coordinates

There are two sources of coordinates for taxids. Note that lifemap is updated weekly and that point coordinates may change after each update.

1. A parquet file downloadable at <lifemap-back.univ-lyon1.fr/data/lmdata.parquet> contains the current lifemap coordinates and other metadata about taxids. The following columns are available: "taxid", "pylifemap_zoom", "pylifemap_x", "pylifemap_y", "pylifemap_ascend", "pylifemap_leaf", and "pylifemap_parent".
2. An Apache Solr API allows to get the current coordinates and zoom levels of a set of taxids. See the `get_data_coords` function in `src/data/api.js` for a way to query the API. Note that the latest coordinates are automatically retrieved if there are less than 100 000 unique taxids in the datasets provided to Lifemap, the coordinates in the data are on ly used if there are more than 100 000 data points or if the API request fails.

Please note that coordinates are in EPSG:4326 projection (GPS) and must be converted to EPSG:3857 (Web mercator) before being passed to Lifemap.

## `layers` object

The `layers` object is an array containing the list of layer to be added to the Lifemap. Each layer is defined by a dictionary like the following:

```js
{
    layer: "points",
    id: "layer_points",
    options: {
        fill: "points_value",
        hover: true,
        popup: true,
        lazy: true,
        lazy_zoom: 10,
    },
},
```

- `layer` defines the type of layer (`points`, `lines`, `heatmap`, `heatmap_deck`, etc.).
- `id` is the layer identifier. It must match one of the keys of the `data` object to be able to retrieve the layer data.
- `options` define specific layer options. See the source code of the layer functions in `src/layers` for more details.
