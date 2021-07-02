#!/usr/bin/env node
'use strict';

const {Parser} = require('json2csv');
const fs = require('fs');
const csv = require('csvtojson');
const path = require('path');
const uniqBy = require('lodash.uniqby');

(async () => {

    const BASE_PATH = path.join(
        __dirname,
        `./data`
    )

    // Loop through all the files in the data directory
    // and get the results
    let allRows = [];
    let countryCode = 'CO';
    const files = fs.readdirSync(BASE_PATH);
    console.info(`Starting analysis of ${files.length} files`);
    for (let file of files) {
        console.info(`Reading ${file}`);
        try {
            const rows = await csv()
                .fromStream(fs.createReadStream(`${BASE_PATH}/${file}`));
            allRows = uniqBy(allRows.concat(rows), 'orig_id');
        } catch (err) {
            console.error(err);
            process.exit();
        }
    }

    // Get the unique rows based on ID
    console.info(`Retrieving unique rows`);
    const uniqueRows = uniqBy(allRows, 'orig_id');

    // Save as a new cleaned JSON file
    console.info(`Saving as cleansed JSON file`);
    const json2csvParser = new Parser();
    const newCsv = json2csvParser.parse(uniqueRows.map(({
                                                            name,
                                                            orig_id,
                                                            streetAddress,
                                                            state,
                                                            location,
                                                            platinum
                                                        }) => ({
        name,
        orig_id,
        streetAddress,
        state,
        location,
        platinum
    })));
    fs.writeFileSync(`./cleaned_data/wu-locations-for-${countryCode}.csv`, newCsv);

    // Save as a GeoJSON file to see where all the locations are - upload to a GIST
    const features = uniqueRows.map(d => {
        const [latitude, longitude] = d.location.split(',');
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude],
                "properties": {
                    id: d.orig_id
                }
            }
        }
    })
    fs.writeFileSync(`./cleaned_data/wu-locations-for-${countryCode}.geojson`, JSON.stringify({
        "type": "FeatureCollection",
        features
    }));

    // Exit when complete
    process.exit();
})()
