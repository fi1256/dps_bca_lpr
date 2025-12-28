import fs from "fs";

const ADDRESSES = JSON.parse(fs.readFileSync("ripped.json", "utf8"));

const geocode = async (q) => {
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return geocodeGoogle(q);
  } else if (process.env.MAPBOX_TOKEN) {
    return geocodeMapbox(q);
  } else {
    throw new Error("No geocoding API key provided");
  }
};

const geocodeGoogle = async (q) => {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      q
    )}&components=administrative_area:Minnesota&key=${process.env.GOOGLE_MAPS_API_KEY}`
  );

  const data = await res.json();

  const location = data.results[0].geometry.location;

  return {
    geometry: {
      type: "Point",
      coordinates: [location.lng, location.lat],
    },
    properties: {
      name_preferred: data.results[0].formatted_address,
    },
  };
};

const geocodeMapbox = async (q) => {
  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
      q
    )}&bbox=-97.239,43.499,-89.490,49.384&access_token=${
      process.env.MAPBOX_TOKEN
    }`
  );

  const data = await res.json();

  return data.features[0];
};

const features = [];

for (let i = 0, l = ADDRESSES.length; i < l; i++) {
  const region = ADDRESSES[i];

  for (let j = 0, m = region.items.length; j < m; j++) {
    const addr = region.items[j];

    let direction;
    ["northbound", "southbound", "eastbound", "westbound"].forEach((dir) => {
      if (addr.includes(dir)) {
        direction = dir.trim();
      }
    });

    const intersection = addr
      .replaceAll(/\u200B/g, "")
      .replaceAll(/\u00A0/g, " ")
      .replaceAll(";", " ")
      .replace(/\sat\s/, " and ")
      .replace(/\snear\s/, " and ")
      .replace("south of", "and")
      .replace("north of", "and")
      .replace("east of", "and")
      .replace("west of", "and")
      .replace(", eastbound", "")
      .replace("eastbound", "")
      .replace(", westbound", "")
      .replace("westbound", "")
      .replace(", northbound", "")
      .replace("northbound", "")
      .replace(", southbound", "")
      .replace("southbound", "")
      .replace("entrance on", ",")
      .trim();

    const searchAddr = `${intersection}, ${region.region}, MN, USA`;

    const result = await geocode(searchAddr);
    console.log(result);

    const feature = {
      type: "Feature",
      geometry: result.geometry,
      properties: {
        agency: region.buttonText,
        searchRegion: region.region,
        addr,
        searchAddr,
        result_name: result.properties.name_preferred,
        accuracy: result.properties.coordinates?.accuracy,
        direction,
        match_code: result.properties.match_code,
      },
    };

    console.log(searchAddr, feature);

    features.push(feature);

    await new Promise((r) => setTimeout(r, 500)); // required
  }
}

const SOURCE =
  "https://dps.mn.gov/divisions/bca/data-and-reports/agencies-use-lprs-lpr";

const FeatureCollection = {
  type: "FeatureCollection",
  metadata: { generated: new Date().toISOString(), source_url: SOURCE },
  features,
};

fs.writeFileSync(
  "mn_dps_bca_lpr.json",
  JSON.stringify(FeatureCollection, null, 2),
  "utf8"
);
