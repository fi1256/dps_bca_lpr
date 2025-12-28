First, get the list of LPR location strings:

```
node rip.js
```

That should produce `ripped.json`.

Then, geocode them to generate the geojson:

```
MAPBOX_TOKEN=<your token> node geocode.js
```
